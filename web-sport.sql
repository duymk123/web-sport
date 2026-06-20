create table categories
(
    id         bigint auto_increment
        primary key,
    parent_id  bigint                             null,
    name       varchar(255)                       null,
    slug       varchar(255)                       null,
    created_at datetime default CURRENT_TIMESTAMP null,
    constraint slug
        unique (slug),
    constraint categories_ibfk_1
        foreign key (parent_id) references categories (id)
            on delete set null
);

create index parent_id
    on categories (parent_id);

create table coupons
(
    id                  bigint auto_increment
        primary key,
    code                varchar(50)                          not null,
    discount_type       enum ('PERCENT', 'FIXED')            not null,
    discount_value      decimal(19, 2)                       not null,
    max_discount_amount decimal(19, 2)                       null,
    usage_limit         int                                  null,
    used_count          int        default 0                 null,
    start_date          datetime                             not null,
    end_date            datetime                             not null,
    is_active           tinyint(1) default 1                 null,
    created_at          datetime   default CURRENT_TIMESTAMP null,
    updated_at          datetime   default CURRENT_TIMESTAMP null on update CURRENT_TIMESTAMP,
    constraint code
        unique (code)
);

create table product_types
(
    id         bigint auto_increment
        primary key,
    name       varchar(255)                       null,
    slug       varchar(255)                       null,
    created_at datetime default CURRENT_TIMESTAMP null,
    constraint slug
        unique (slug)
);

create table products
(
    id             bigint auto_increment
        primary key,
    category_id    bigint                             not null,
    name           varchar(255)                       not null,
    brand          varchar(255)                       null,
    description    text                               null,
    specifications json                               null,
    status         tinyint                            null,
    created_at     datetime default CURRENT_TIMESTAMP null,
    updated_at     datetime default CURRENT_TIMESTAMP null on update CURRENT_TIMESTAMP,
    type_id        bigint                             null,
    constraint fk_product_type
        foreign key (type_id) references product_types (id),
    constraint products_ibfk_1
        foreign key (category_id) references categories (id)
);

create table product_images
(
    id         bigint auto_increment
        primary key,
    product_id bigint       not null,
    image_url  varchar(500) not null,
    constraint product_images_ibfk_1
        foreign key (product_id) references products (id)
            on delete cascade
);

create index product_id
    on product_images (product_id);

create table product_variants
(
    id             bigint auto_increment
        primary key,
    product_id     bigint         not null,
    sku            varchar(100)   not null,
    color          varchar(50)    null,
    size           varchar(20)    null,
    price          decimal(19, 2) not null,
    stock_quantity int default 0  not null,
    constraint sku
        unique (sku),
    constraint product_variants_ibfk_1
        foreign key (product_id) references products (id)
            on delete cascade
);

create index product_id
    on product_variants (product_id);

create index category_id
    on products (category_id);

create table users
(
    id           bigint auto_increment
        primary key,
    user_name    varchar(255)                       not null,
    password     varchar(255)                       not null,
    full_name    varchar(255)                       null,
    phone_number varchar(255)                       null,
    status       enum ('ACTIVE', 'INACTIVE')        null,
    created_at   datetime default CURRENT_TIMESTAMP null,
    updated_at   datetime default CURRENT_TIMESTAMP null on update CURRENT_TIMESTAMP,
    role         enum ('ADMIN', 'CUSTOMER')         null,
    constraint email
        unique (user_name)
);

create table carts
(
    id         bigint auto_increment
        primary key,
    user_id    bigint                             not null,
    created_at datetime default CURRENT_TIMESTAMP null,
    updated_at datetime default CURRENT_TIMESTAMP null on update CURRENT_TIMESTAMP,
    constraint carts_ibfk_1
        foreign key (user_id) references users (id)
);

create table cart_items
(
    id                 bigint auto_increment
        primary key,
    cart_id            bigint not null,
    product_variant_id bigint not null,
    quantity           int    not null,
    constraint unique_cart_variant
        unique (cart_id, product_variant_id),
    constraint cart_items_ibfk_1
        foreign key (cart_id) references carts (id)
            on delete cascade,
    constraint cart_items_ibfk_2
        foreign key (product_variant_id) references product_variants (id)
            on delete cascade,
    check (`quantity` > 0)
);

create index product_variant_id
    on cart_items (product_variant_id);

create index user_id
    on carts (user_id);

create table orders
(
    id               bigint auto_increment
        primary key,
    user_id          bigint                                                                                        not null,
    full_name        varchar(255) charset utf8mb3                                                                  not null,
    phone_number     varchar(10)                                                                                   not null,
    shipping_address text                                                                                          not null,
    total_amount     decimal(19, 2)                                                                                not null,
    payment_method   enum ('cod', 'vnpay', 'bank_transfer')                              default 'cod'             null,
    status           enum ('pending', 'confirmed', 'shipping', 'delivered', 'cancelled') default 'pending'         null,
    note             text                                                                                          null,
    created_at       datetime                                                            default CURRENT_TIMESTAMP null,
    updated_at       datetime                                                            default CURRENT_TIMESTAMP null on update CURRENT_TIMESTAMP,
    constraint orders_ibfk_1
        foreign key (user_id) references users (id)
            on delete cascade
);

create table order_items
(
    id                 bigint auto_increment
        primary key,
    order_id           bigint         not null,
    product_variant_id bigint         not null,
    quantity           int            not null,
    price_at_purchase  decimal(19, 2) not null,
    constraint order_items_ibfk_1
        foreign key (order_id) references orders (id)
            on delete cascade,
    constraint order_items_ibfk_2
        foreign key (product_variant_id) references product_variants (id)
            on delete cascade,
    check (`quantity` > 0)
);

create index order_id
    on order_items (order_id);

create index product_variant_id
    on order_items (product_variant_id);

create index user_id
    on orders (user_id);

create table password_resets
(
    id          bigint auto_increment
        primary key,
    user_id     bigint       not null,
    reset_token varchar(255) not null,
    expires_at  datetime     not null,
    constraint reset_token
        unique (reset_token),
    constraint password_resets_ibfk_1
        foreign key (user_id) references users (id)
            on delete cascade
);

create index user_id
    on password_resets (user_id);

create table product_reviews
(
    id         bigint auto_increment
        primary key,
    user_id    bigint                             not null,
    product_id bigint                             not null,
    order_id   bigint                             not null,
    rating     int                                not null,
    comment    text                               null,
    created_at datetime default CURRENT_TIMESTAMP null,
    constraint product_reviews_ibfk_1
        foreign key (user_id) references users (id)
            on delete cascade,
    constraint product_reviews_ibfk_2
        foreign key (product_id) references products (id)
            on delete cascade,
    constraint product_reviews_ibfk_3
        foreign key (order_id) references orders (id)
            on delete cascade,
    check ((`rating` >= 1) and (`rating` <= 5))
);

create index order_id
    on product_reviews (order_id);

create index product_id
    on product_reviews (product_id);

create index user_id
    on product_reviews (user_id);

create table return_requests
(
    id         bigint auto_increment
        primary key,
    user_id    bigint                                                                          not null,
    order_id   bigint                                                                          not null,
    reason     text                                                                            not null,
    status     enum ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED') default 'PENDING'         null,
    created_at datetime                                              default CURRENT_TIMESTAMP null,
    updated_at datetime                                              default CURRENT_TIMESTAMP null on update CURRENT_TIMESTAMP,
    constraint return_requests_ibfk_1
        foreign key (user_id) references users (id)
            on delete cascade,
    constraint return_requests_ibfk_2
        foreign key (order_id) references orders (id)
            on delete cascade
);

create index order_id
    on return_requests (order_id);

create index user_id
    on return_requests (user_id);

create table user_addresses
(
    id             bigint auto_increment
        primary key,
    user_id        bigint                               not null,
    receiver_name  varchar(100) charset utf8mb3         not null,
    receiver_phone varchar(10)                          not null,
    is_default     tinyint(1) default 0                 null,
    created_at     datetime   default CURRENT_TIMESTAMP null,
    updated_at     datetime   default CURRENT_TIMESTAMP not null,
    address_type   varchar(255)                         not null,
    city           varchar(100)                         not null,
    district       varchar(255)                         not null,
    detail_address varchar(255)                         not null,
    constraint user_addresses_ibfk_1
        foreign key (user_id) references users (id)
            on delete cascade
);

create index user_id
    on user_addresses (user_id);


