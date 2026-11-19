CREATE TABLE devuser.production_capacity_anan (
	id int8 NOT NULL,
	plant_code varchar(10) NOT NULL,
	line_code varchar(20) NOT NULL,
	record_date date NOT NULL,
	shift_type varchar(10) DEFAULT 'DAY'::character varying NULL,
	target_qty int4 DEFAULT 0 NOT NULL,
	actual_qty int4 DEFAULT 0 NOT NULL,
	defect_rate numeric(5, 2) DEFAULT 0.00 NULL,
	line_status varchar(15) DEFAULT 'ACTIVE'::character varying NOT NULL,
	remarks text NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT production_capacity_anan_pkey PRIMARY KEY (id),
	CONSTRAINT uq_plant_line_date_shift_anan UNIQUE (plant_code, line_code, record_date, shift_type)
);
CREATE INDEX idx_prod_cap_updated_at_anan ON devuser.production_capacity_anan USING btree (updated_at);