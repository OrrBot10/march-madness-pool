CREATE TABLE "entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"year" integer NOT NULL,
	"person_id" integer,
	"name" text NOT NULL,
	"entry_fee" integer DEFAULT 10 NOT NULL,
	"paid" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "games" (
	"year" integer NOT NULL,
	"espn_id" text NOT NULL,
	"round" integer NOT NULL,
	"region" text,
	"start_at" timestamp with time zone NOT NULL,
	"state" text NOT NULL,
	"detail" text DEFAULT '' NOT NULL,
	"a_espn_id" text,
	"a_name" text NOT NULL,
	"a_seed" integer,
	"a_score" integer,
	"b_espn_id" text,
	"b_name" text NOT NULL,
	"b_seed" integer,
	"b_score" integer,
	"winner_espn_id" text,
	"override_winner_espn_id" text,
	CONSTRAINT "games_year_espn_id_pk" PRIMARY KEY("year","espn_id")
);
--> statement-breakpoint
CREATE TABLE "people" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"is_admin" boolean DEFAULT false NOT NULL,
	CONSTRAINT "people_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "picks" (
	"entry_id" integer NOT NULL,
	"team_id" text NOT NULL,
	"shares" integer NOT NULL,
	CONSTRAINT "picks_entry_id_team_id_pk" PRIMARY KEY("entry_id","team_id")
);
--> statement-breakpoint
CREATE TABLE "seasons" (
	"year" integer PRIMARY KEY NOT NULL,
	"status" text NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"lock_at" timestamp with time zone NOT NULL,
	"start_day" text,
	"as_of_day" text,
	"synced_days" text[] DEFAULT '{}' NOT NULL,
	"last_sync_at" timestamp with time zone,
	"last_sync_error" text
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"year" integer NOT NULL,
	"id" text NOT NULL,
	"region" text NOT NULL,
	"seed" integer NOT NULL,
	"name" text NOT NULL,
	"espn_ids" text[] DEFAULT '{}' NOT NULL,
	CONSTRAINT "teams_year_id_pk" PRIMARY KEY("year","id")
);
