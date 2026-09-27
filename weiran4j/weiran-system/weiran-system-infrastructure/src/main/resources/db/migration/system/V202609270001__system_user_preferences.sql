-- sys_user 追加个人偏好与收藏菜单两列（/api/auth/preferences、/api/auth/favorite-menus）。
-- 两列都只由各自接口定向 UPDATE，不参与用户整行读写；null 表示从未保存过。

alter table sys_user
    add column preferences    json null comment '界面偏好（前端 usePreferences 的 JSON 对象，序列化后不超过 16KB；后端只存不解析字段含义）',
    add column favorite_menus json null comment '收藏菜单 ID 数组（按收藏顺序，最多 50 个；读取时过滤已删除或已无权访问的菜单）';
