<?php

require_once 'SystemBase.php';

class Scanner extends SystemBase
{
	protected $root;

	public function __construct($root)
	{
		$this->root = $root;
	}

	public function execute()
	{
		// @todo Put more conditionals in this (if run ok, if scan ok, etc)
		$this->runChecks();

		$this->scan($this->getSystemIniValue('test_mode'));
	}

	/**
	 * Put in various pre-run checks here
	 */
	protected function runChecks()
	{
		// @todo Add in some data/log folder writeability checks
		// @todo Add some sensibility checks for account/system settings

		// Does the database exist? Init it if not
		$databaseFile = $this->getDatabasePath();
		if (!file_exists($databaseFile) || filesize($databaseFile) === 0)
		{
			$this->createDatabase();
		}

		// Check there is a row for the provider matching our account details
		$this->ensureProviderExists();
	}

	protected function createDatabase()
	{
		$queryFile = $this->getRoot() . '/data/init.sql';
		$sql = file_get_contents($queryFile);

		$dbh = $this->getDatabaseHandle();
		$affected = $dbh->exec($sql);
		if ($affected !== 0)
		{
			die("Error: could not initialise SQLite database\n");
		}
	}

	/**
	 * Run the initialisation routines
	 */
	protected function scan($testMode = false)
	{
		// Start timer
		$timeStart = microtime(true);

		// Run command
		if ($testMode)
		{
			system($this->getCommandLine());
		}
		else
		{
			$output = array();
			exec($this->getCommandLine(), $output);
			$this->writeLogFile($output);
		}

		$timeElapsed = microtime(true) - $timeStart;
		echo sprintf("Operation took %f seconds\n", $timeElapsed);		
	}

	protected function ensureProviderExists()
	{
		$params = array(
			'name' => $this->getAccountIniValue('provider'),
			'country' => $this->getAccountIniValue('country'),
			'currency_symbol' => $this->getAccountIniValue('currency_symbol'),
		);
		$dbh = $this->getDatabaseHandle();

		$sql = "
			SELECT
				COUNT(*) AS row_count
			FROM
				provider
			WHERE
				name = :name
				AND country = :country
				AND currency_symbol = :currency_symbol
			LIMIT
				1
		";
		$stmt = $dbh->prepare($sql);
		if ($stmt === false)
		{
			print_r($dbh->errorInfo());
			die("Error: prepare error when checking provider\n");
			exit();
		}

		$ok = $stmt->execute($params);
		if (!$ok)
		{
			die("Error: query error when checking provider\n");
		}

		$rows = $stmt->fetchColumn();
		if ($rows === 0)
		{
			$insertSql = "
				INSERT INTO
					provider
					(name, country, currency_symbol, currency_prefixed)
				VALUES
					(:name, :country, :currency_symbol, :currency_prefixed)
			";
			$params['currency_prefixed'] = $this->getAccountIniValue('currency_prefixed');
			$stmt = $dbh->prepare($insertSql);
			if ($stmt === false)
			{
				print_r($dbh->errorInfo());
				die("Error: prepare error when creating provider\n");
				exit();
			}
			$ok = $stmt->execute($params);
		}
	}

	/**
	 * Writes log file
	 */
	protected function writeLogFile(array $lines)
	{
		// Ensure the log file exists
		@mkdir($this->getLogPath(), 0711, $_recursive = true);

		$logFile = $this->getLogFile();
		file_put_contents($logFile, implode("\n", $lines));
		echo sprintf("Wrote output to log file: %s\n", $logFile);
	}

	protected function getLogFile()
	{
		static $filename = null;

		// This is static, so will only be set once
		if (!$filename)
		{
			$filename = time() . '.log';
		}

		return $this->getLogPath() . '/' . $filename;
	}

	/**
	 * Derives the fully-qualified script path
	 * 
	 * @return string
	 */
	protected function getScriptPath()
	{
		return
			$this->getRoot() .
			'/accounts/' . $this->getAccountIniValue('country') .
			'/' . $this->getAccountIniValue('provider') .
			'/main.js'
		;
	}

	/**
	 * Builds the parameters string in JSON
	 * 
	 * @return string
	 */
	protected function getCommandLineParameters()
	{
		$args = array(
			'username'             => $this->getAccountIniValue('username'),
			'password'             => $this->getAccountIniValue('password'),
			'echoRemote'           => (boolean) $this->getSystemIniValue('echo_remote_console'),
			'executionTimeLimit'   => (float) $this->getAccountIniValue('execution_time_limit'),
			'bytesPerK'            => (integer) $this->getAccountIniValue('bytes_per_k'),
			'kbytesPerM'           => (integer) $this->getAccountIniValue('kbytes_per_m'),
			'mbytesPerG'           => (integer) $this->getAccountIniValue('mbytes_per_g'),
		);

		return escapeshellarg(json_encode($args));
	}

	protected function getCommandLineOptions()
	{
		// Set up command options
		$options = array(
			'--load-images=false',
			'--cookies-file=cookies.txt',
		);

		// Add in SSL config
		if ($this->getAccountIniValue('ignore_ssl_errors'))
		{
			$options[] = '--ignore-ssl-errors=true';
		}

		return implode(' ', $options);
	}

	protected function getCommandLine()	
	{
		return
			$this->getSystemIniValue('phantom_executable') . ' ' .
			$this->getCommandLineOptions() . ' ' .
			$this->getScriptPath() . ' ' .
			$this->getCommandLineParameters()
		;
	}
}