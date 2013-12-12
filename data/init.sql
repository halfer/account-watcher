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
	country VARCHAR NOT NULL
);

CREATE TABLE IF NOT EXISTS scan (
	id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
	provider_id INTEGER REFERENCES provider (id),
	time_start INTEGER NOT NULL,
	/* Not null as we may wish to write to the table prior to finishing */
	time_end INTEGER,
	/* All values prefixed with data_ come from the script */
	data_last_updated VARCHAR,
	/*
	 * We define "used" as the total amount of data used, including:
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
	 * their allowance.
	 */
	data_usage_total VARCHAR,
	data_allowance_used VARCHAR,
	data_allowance_remaining VARCHAR,
	data_allowance_total VARCHAR
);
