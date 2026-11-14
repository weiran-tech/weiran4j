-- 兼容早期本地库的 owner_namespace；当前版本新建的库已经使用 user_type。
-- 只在旧列不存在且新列存在时跳过；两列同时存在或同时缺失时让 RENAME 报错，避免掩盖异常结构。
-- RENAME 保留任务数据、列定义及引用该列的 idx_sys_task_owner 索引。
set @batch_owner_column_sql = (
    select if(
        sum(column_name = 'owner_namespace') = 0 and sum(column_name = 'user_type') = 1,
        'do 0',
        'alter table sys_task rename column owner_namespace to user_type'
    )
    from information_schema.columns
    where table_schema = database() and table_name = 'sys_task'
);

prepare batch_owner_column_statement from @batch_owner_column_sql;
execute batch_owner_column_statement;
deallocate prepare batch_owner_column_statement;
set @batch_owner_column_sql = null;
