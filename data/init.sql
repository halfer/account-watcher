/**
 * Database creation script
 *
 * @todo Make more generic by requiring each provider script to declare various rates.
 * For example, uk/orange could declare charge entries for:
 *
 * - data usage off-peak within allowance (free)
 * - data usage on-peak within allowance (free)
 * - data usage at any time outside allowance (chargable)
 *
 * New provider scripts could declare as many usage bands as they can extract from
 * their target website
 */

CREATE TABLE IF NOT EXISTS provider (
	id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
	name VARCHAR NOT NULL,
	country VARCHAR NOT NULL,
	currency_symbol VARCHAR NOT NULL,
	currency_prefixed BOOLEAN NOT NULL
);

/* @todo Add unique constraint on (name, country, currency_symbol) */

CREATE TABLE IF NOT EXISTS scan (
	id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
	provider_id INTEGER REFERENCES provider (id) NOT NULL,
	time_start INTEGER NOT NULL,
	time_end INTEGER NOT NULL,

	/* All these values come from the script */
	last_updated VARCHAR,
	/*
	 * Notes:
	 *
	 * 1. We define "used" as the total amount of data used, including:
	 *
	 * Anything used within an allowance
	 * Anything used outside an allowance that is chargeable
	 * Anything used outside an allowance that is non-chargeable
	 *
	 * Here's an example. Let's say that a provider offers:
	 * 
	 *	- 4G of data per month during peak hours
	 *	- 2G of data per day during off-peak hours
	 *
	 * This explains how a user can have used 20G in total, but only be 1G into
	 * their monthly allowance.
	 *
	 * 2. Bandwidth values are stored as text (e.g. 1234.1 MB) and as integers too. This is because the
	 * user may select that 1024M = 1G only to find that their provider uses 1000M = 1G. In those
	 * circumstances it would be nice to be able to recalculate.
	 */
	allowance_used_text VARCHAR,
	allowance_used INTEGER,
	allowance_remaining_text INTEGER,
	allowance_remaining INTEGER,
	usage_total_text VARCHAR,
	usage_total INTEGER,
	balance_text VARCHAR,
	balance INTEGER
);
