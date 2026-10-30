update sys_config
set field_type = 'files'
where config_key = 'system.demo.images'
  and config_type = 'json'
  and field_type = 'json';
