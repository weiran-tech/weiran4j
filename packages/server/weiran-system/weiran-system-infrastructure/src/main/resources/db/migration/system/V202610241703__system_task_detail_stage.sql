alter table sys_task_detail
    add column stage varchar(24) not null default 'processing' comment 'validating / processing' after item_name,
    drop index uk_sys_task_detail_item,
    add unique key uk_sys_task_detail_stage_item (task_id, stage, item_no),
    add key idx_sys_task_detail_stage_status (task_id, stage, status, item_no);
