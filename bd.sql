-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.espacio (
  id_espacio integer NOT NULL DEFAULT nextval('espacio_id_espacio_seq'::regclass),
  id_parking integer,
  numero_espacio character varying NOT NULL,
  estado character varying NOT NULL DEFAULT 'disponible'::character varying,
  CONSTRAINT espacio_pkey PRIMARY KEY (id_espacio),
  CONSTRAINT espacio_id_parking_fkey FOREIGN KEY (id_parking) REFERENCES public.parking(id_parking)
);
CREATE TABLE public.metodopago (
  id_metodo integer NOT NULL DEFAULT nextval('metodopago_id_metodo_seq'::regclass),
  nombre character varying NOT NULL,
  CONSTRAINT metodopago_pkey PRIMARY KEY (id_metodo)
);
CREATE TABLE public.notificacion (
  id_notificacion integer NOT NULL DEFAULT nextval('notificacion_id_notificacion_seq'::regclass),
  id_usuario uuid,
  mensaje text NOT NULL,
  tipo character varying,
  estado character varying DEFAULT 'no_leido'::character varying,
  fecha_envio timestamp without time zone DEFAULT now(),
  CONSTRAINT notificacion_pkey PRIMARY KEY (id_notificacion),
  CONSTRAINT notificacion_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario)
);
CREATE TABLE public.ocupacion (
  id_ocupacion integer NOT NULL DEFAULT nextval('ocupacion_id_ocupacion_seq'::regclass),
  id_reserva integer,
  id_usuario uuid,
  id_espacio integer,
  hora_entrada timestamp without time zone NOT NULL,
  hora_salida timestamp without time zone,
  costo_total numeric,
  CONSTRAINT ocupacion_pkey PRIMARY KEY (id_ocupacion),
  CONSTRAINT ocupacion_id_reserva_fkey FOREIGN KEY (id_reserva) REFERENCES public.reserva(id_reserva),
  CONSTRAINT ocupacion_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario),
  CONSTRAINT ocupacion_id_espacio_fkey FOREIGN KEY (id_espacio) REFERENCES public.espacio(id_espacio)
);
CREATE TABLE public.pago (
  id_pago integer NOT NULL DEFAULT nextval('pago_id_pago_seq'::regclass),
  id_ocupacion integer,
  id_metodo integer,
  monto numeric NOT NULL,
  estado character varying NOT NULL DEFAULT 'pendiente'::character varying,
  fecha_pago timestamp without time zone DEFAULT now(),
  CONSTRAINT pago_pkey PRIMARY KEY (id_pago),
  CONSTRAINT pago_id_ocupacion_fkey FOREIGN KEY (id_ocupacion) REFERENCES public.ocupacion(id_ocupacion),
  CONSTRAINT pago_id_metodo_fkey FOREIGN KEY (id_metodo) REFERENCES public.metodopago(id_metodo)
);
CREATE TABLE public.parking (
  id_parking integer NOT NULL DEFAULT nextval('parking_id_parking_seq'::regclass),
  nombre character varying NOT NULL,
  direccion text NOT NULL,
  latitud numeric NOT NULL,
  longitud numeric NOT NULL,
  capacidad_total integer NOT NULL,
  id_admin uuid,
  deleted_at timestamp without time zone,
  deleted_by uuid,
  motivo_baja text,
  CONSTRAINT parking_pkey PRIMARY KEY (id_parking),
  CONSTRAINT parking_id_admin_fkey FOREIGN KEY (id_admin) REFERENCES public.usuario(id_usuario),
  CONSTRAINT parking_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.usuario(id_usuario)
);
CREATE TABLE public.reserva (
  id_reserva integer NOT NULL DEFAULT nextval('reserva_id_reserva_seq'::regclass),
  id_usuario uuid,
  id_espacio integer,
  fecha_reserva timestamp without time zone DEFAULT now(),
  hora_inicio timestamp without time zone NOT NULL,
  hora_fin timestamp without time zone NOT NULL,
  estado character varying NOT NULL DEFAULT 'pendiente'::character varying,
  CONSTRAINT reserva_pkey PRIMARY KEY (id_reserva),
  CONSTRAINT reserva_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario),
  CONSTRAINT reserva_id_espacio_fkey FOREIGN KEY (id_espacio) REFERENCES public.espacio(id_espacio)
);
CREATE TABLE public.tarifa (
  id_tarifa integer NOT NULL DEFAULT nextval('tarifa_id_tarifa_seq'::regclass),
  id_parking integer,
  tipo character varying NOT NULL,
  monto numeric NOT NULL,
  condiciones text,
  CONSTRAINT tarifa_pkey PRIMARY KEY (id_tarifa),
  CONSTRAINT tarifa_id_parking_fkey FOREIGN KEY (id_parking) REFERENCES public.parking(id_parking)
);
CREATE TABLE public.usuario (
  id_usuario uuid NOT NULL,
  nombre character varying NOT NULL,
  apellido character varying NOT NULL,
  telefono character varying,
  rol character varying NOT NULL CHECK (rol::text = ANY (ARRAY['admin_general'::character varying, 'admin_parking'::character varying, 'empleado'::character varying, 'cliente'::character varying]::text[])),
  fecha_registro timestamp without time zone DEFAULT now(),
  email text NOT NULL DEFAULT ''::text,
  bloqueado boolean DEFAULT false,
  deleted_at timestamp without time zone,
  deleted_by uuid,
  motivo_baja text,
  CONSTRAINT usuario_pkey PRIMARY KEY (id_usuario)
);
CREATE TABLE public.usuario_parking (
  id_usuario uuid NOT NULL,
  id_parking integer NOT NULL,
  rol_en_parking character varying NOT NULL CHECK (rol_en_parking::text = ANY (ARRAY['admin_parking'::character varying, 'empleado'::character varying]::text[])),
  fecha_asignacion timestamp without time zone DEFAULT now(),
  CONSTRAINT usuario_parking_pkey PRIMARY KEY (id_usuario, id_parking),
  CONSTRAINT usuario_parking_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario),
  CONSTRAINT usuario_parking_id_parking_fkey FOREIGN KEY (id_parking) REFERENCES public.parking(id_parking)
);
CREATE TABLE public.vehiculo (
  id_vehiculo integer NOT NULL DEFAULT nextval('vehiculo_id_vehiculo_seq'::regclass),
  id_usuario uuid,
  placa character varying NOT NULL UNIQUE,
  marca character varying,
  modelo character varying,
  color character varying,
  CONSTRAINT vehiculo_pkey PRIMARY KEY (id_vehiculo),
  CONSTRAINT vehiculo_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario)
);