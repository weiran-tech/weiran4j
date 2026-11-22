-- 旧 JSON 种子中的布尔值可能为 0/1，拆分后统一为严格的 true/false 标量。
update sys_config
set config_value = if(config_value = '1', 'true', 'false')
where group_key = 'security'
  and config_type = 'boolean'
  and config_value in ('0', '1');
