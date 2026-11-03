/**
 * 项目级检查 · 当前 type=backend，API 必须遵循 /api-backend/[n/]模块/资源/动作。
 *
 * 存量按 HEAD 中的全局 method + path 精确兼容：改业务代码不会触发迁移，新增或改名的
 * 非规范路由会被拦截。例外只能在 project.json 按精确 method + path 登记并写明理由。
 */
import { readFileSync, readdirSync } from 'node:fs'

const SOURCE_ROOT = 'packages/server'
const MAPPING = /^@(RequestMapping|GetMapping|PostMapping|PutMapping|DeleteMapping|PatchMapping)\b\s*(?:\(([^)]*)\))?/
const CLASS_DECL = /\bclass\s+[A-Za-z_$][\w$]*/
const METHOD_NAMES = {
  GetMapping: ['GET'],
  PostMapping: ['POST'],
  PutMapping: ['PUT'],
  DeleteMapping: ['DELETE'],
  PatchMapping: ['PATCH'],
}

function walk(dir, out = []) {
  let entries
  try { entries = readdirSync(dir, { withFileTypes: true }) } catch { return out }
  for (const entry of entries) {
    const path = `${dir}/${entry.name}`
    if (entry.isDirectory()) {
      if (entry.name !== 'build' && entry.name !== '.gradle') walk(path, out)
    } else if (entry.isFile() && entry.name.endsWith('.java') && !path.includes('/src/test/')) {
      out.push(path)
    }
  }
  return out
}

function unquote(value) {
  return [...value.matchAll(/"([^"\\]*(?:\\.[^"\\]*)*)"/g)].map((match) => match[1])
}

function pathsFrom(args) {
  const pathArg = args.match(/\b(?:value|path)\s*=\s*(\{[^}]*\}|"[^"\\]*(?:\\.[^"\\]*)*")/)
  if (pathArg) return unquote(pathArg[1])
  const first = args.match(/^\s*(\{[^}]*\}|"[^"\\]*(?:\\.[^"\\]*)*")/)
  return first ? unquote(first[1]) : ['']
}

function requestMethods(type, args) {
  if (METHOD_NAMES[type]) return METHOD_NAMES[type]
  const methods = [...args.matchAll(/RequestMethod\.(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)/g)].map((match) => match[1])
  return methods.length ? methods : ['*']
}

function joinPath(prefix, suffix) {
  return `/${[prefix, suffix].join('/').split('/').filter(Boolean).join('/')}`
}

function sourceAnnotations(source) {
  const annotations = []
  let index = 0
  while (index < source.length) {
    if (source.startsWith('//', index)) {
      const end = source.indexOf('\n', index + 2)
      index = end === -1 ? source.length : end + 1
      continue
    }
    if (source.startsWith('/*', index)) {
      const end = source.indexOf('*/', index + 2)
      index = end === -1 ? source.length : end + 2
      continue
    }
    if (source.startsWith('"""', index)) {
      const end = source.indexOf('"""', index + 3)
      index = end === -1 ? source.length : end + 3
      continue
    }
    if (source[index] === '"' || source[index] === "'") {
      const quote = source[index++]
      while (index < source.length) {
        if (source[index] === '\\') index += 2
        else if (source[index++] === quote) break
      }
      continue
    }
    if (source[index] === '@') {
      const match = MAPPING.exec(source.slice(index))
      if (match) {
        annotations.push({ index, type: match[1], args: match[2] ?? '' })
        index += match[0].length
        continue
      }
    }
    index += 1
  }
  return annotations
}

function maskNonCode(source) {
  const chars = source.split('')
  let index = 0
  const blank = (start, end) => {
    for (let cursor = start; cursor < end; cursor += 1) {
      if (chars[cursor] !== '\n') chars[cursor] = ' '
    }
  }
  while (index < source.length) {
    if (source.startsWith('//', index)) {
      const end = source.indexOf('\n', index + 2)
      const stop = end === -1 ? source.length : end
      blank(index, stop)
      index = stop
    } else if (source.startsWith('/*', index)) {
      const end = source.indexOf('*/', index + 2)
      const stop = end === -1 ? source.length : end + 2
      blank(index, stop)
      index = stop
    } else if (source.startsWith('"""', index)) {
      const end = source.indexOf('"""', index + 3)
      const stop = end === -1 ? source.length : end + 3
      blank(index, stop)
      index = stop
    } else if (source[index] === '"' || source[index] === "'") {
      const start = index
      const quote = source[index++]
      while (index < source.length) {
        if (source[index] === '\\') index += 2
        else if (source[index++] === quote) break
      }
      blank(start, index)
    } else {
      index += 1
    }
  }
  return chars.join('')
}

function scanRoutes(source) {
  const code = maskNonCode(source)
  const classMatch = CLASS_DECL.exec(code)
  if (!classMatch) return []
  const classStart = classMatch.index
  const classBodyStart = code.indexOf('{', classStart)
  const annotations = sourceAnnotations(source)
  const classAnnotations = annotations.filter((match) => match.index < classStart)
  if (!/@(?:RestController|Controller)\b/.test(code.slice(0, classStart))) return []
  const classMapping = classAnnotations.find((match) => match.type === 'RequestMapping')
  const prefixes = classMapping ? pathsFrom(classMapping.args) : ['']
  const methods = annotations.filter((match) => match.index > classBodyStart)
  const routes = []
  for (const mapping of methods) {
    const { type, args } = mapping
    const routeMethods = requestMethods(type, args)
    for (const prefix of prefixes) {
      for (const suffix of pathsFrom(args)) {
        const path = joinPath(prefix, suffix)
        if (path === '/api' || path.startsWith('/api/') || path.startsWith('/api-')) {
          for (const method of routeMethods) routes.push(`${method} ${path}`)
        }
      }
    }
  }
  return [...new Set(routes)]
}

function isCompliant(signature) {
  const path = signature.slice(signature.indexOf(' ') + 1)
  const segments = path.split('/').filter(Boolean)
  if (segments[0] !== 'api-backend') return false
  const first = segments[1] === 'n' ? 2 : 1
  return segments.length >= first + 3
    && segments.slice(first, first + 3).every((segment) => !segment.startsWith('{') && !segment.endsWith('}'))
}

export default {
  id: 'api-route-convention',
  watches: [SOURCE_ROOT, 'openspec/project.json', 'openspec/rules/advisory/api-design.md'],

  run({ ROOT, join, project, rel, err, git }) {
    const exceptionReasons = new Map(Object.entries(project?.apiRouteConvention?.exceptions ?? {}))
    const files = walk(join(ROOT, SOURCE_ROOT))
    const baseline = new Set()
    const current = new Map()
    // 目录改名尚未提交时，HEAD 里的源码仍位于旧目录；存量路由基线必须继续可读。
    const currentHeadFiles = git(['ls-tree', '-r', '--name-only', 'HEAD', '--', SOURCE_ROOT])
    const baselineRoot = currentHeadFiles ? SOURCE_ROOT : 'server'
    const baselineFiles = new Set(git(['ls-tree', '-r', '--name-only', 'HEAD', '--', baselineRoot]).split('\n'))

    for (const file of files) {
      const relative = rel(file)
      const baselineRelative = relative.replace(`${SOURCE_ROOT}/`, `${baselineRoot}/`)
      const baseSource = baselineFiles.has(baselineRelative) ? git(['show', `HEAD:${baselineRelative}`]) : ''
      for (const route of scanRoutes(baseSource)) baseline.add(route)
      for (const route of scanRoutes(readFileSync(file, 'utf8'))) {
        if (!current.has(route)) current.set(route, relative)
      }
    }

    for (const [signature, file] of current) {
      if (isCompliant(signature) || (baseline.has(signature) && signature.includes(' /api-backend/')) || exceptionReasons.has(signature)) continue
      const reason = exceptionReasons.get(signature)
      if (typeof reason === 'string' && reason.trim()) continue
      err(
        'REPO/api-route-nonconforming',
        file,
        `新增路由 ${signature} 不符合 /api-backend/[n/]模块/资源/动作；按需调整路径，或仅对确需保留的精确路由在 project.json 的 apiRouteConvention.exceptions 写明理由`,
      )
    }

    for (const [signature, reason] of exceptionReasons) {
      if (typeof reason !== 'string' || !reason.trim()) {
        err('REPO/api-route-exception-reason', 'openspec/project.json', `路由例外 ${signature} 必须填写非空理由`)
      }
      if (!current.has(signature)) {
        err('REPO/api-route-exception-stale', 'openspec/project.json', `路由例外 ${signature} 不再存在，请移除`)
      }
    }
  },
}
