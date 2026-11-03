alter table sys_task
    add column input_mode varchar(24) not null default 'managed_file' after source_key,
    add column input_fingerprint char(64) null after input_mode,
    add column selected_count bigint null after total,
    add column decided_at datetime null after selected_count;

alter table sys_task_detail
    add column source_location varchar(500) null after item_name,
    add column idempotency_key varchar(191) null after source_location,
    add column display_data varchar(2048) null after message,
    add column result_type varchar(64) null after display_data,
    add column result_id varchar(191) null after result_type;
