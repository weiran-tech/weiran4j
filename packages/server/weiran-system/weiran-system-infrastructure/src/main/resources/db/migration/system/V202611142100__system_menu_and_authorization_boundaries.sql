alter table sys_menu add column edit_version int not null default 0;

create table sys_menu_structure_guard (
    id tinyint unsigned not null primary key
);
insert into sys_menu_structure_guard (id) values (1);

create table sys_authorization_revision (
    id tinyint unsigned not null primary key,
    revision bigint not null default 0
);
insert into sys_authorization_revision (id, revision) values (1, 0);
