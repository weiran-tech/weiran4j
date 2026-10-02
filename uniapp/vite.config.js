import {
	defineConfig
} from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
// import path from 'path' // 如果需要 path 模块

export default defineConfig({
	plugins: [uni()],
	server: {
		host: '0.0.0.0',
		port: 5174,
		headers: {
			'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
			'Pragma': 'no-cache',
			'Expires': '0'
		},
		// 核心配置：代理
		proxy: {
			// 后端 mono4j（weiran4j bootRun 默认端口 3300）；uniapp 接口统一走 /api-web/**
			'/api-web': {
				target: 'http://127.0.0.1:3300',
				changeOrigin: true,
			},
		}
	}
})