<?php

class Scanner
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

		if ($this->getSystemIniValue('test_mode'))
		{
			$this->scan(true);
		}
		else
		{
			$this->scan();
			$this->extractData();
		}
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

	/**
	 * Extracts data from the log file
	 * 
	 * @todo Separate this out into another class
	 */
	protected function extractData()
	{
		// For testing
		//$logFile = $this->getLogPath() . '/1386935124.log';
		$logFile = $this->getLogFile();

		$logData = file_get_contents($logFile);
		$matches = array();
		preg_match_all('/^\[data\]\s*(.+)\s*$/m', $logData, $matches);

		// Retrieve the data from the parenthesis group
		if (isset($matches[1]))
		{
			$this->storeExtractedData($matches[1]);
		}
		else
		{
			echo "No data found";
		}
	}

	protected function storeExtractedData(array $jsonStrings)
	{
		$allData = array();
		foreach ($jsonStrings as $jsonString)
		{
			$thisData = json_decode($jsonString, true);

			// Remove any debug keys (they're there just for logging purposes)
			foreach(array_keys($thisData) as $key)
			{
				$isDebug = (boolean) preg_match('/^debug_/', $key);
				if ($isDebug)
				{
					unset($thisData[$key]);
				}
			}

			if (is_array($thisData))
			{
				$allData = array_merge($allData, $thisData);
			}
		}

		print_r($allData);

		// Unset any non-permitted columns, build parameter list
		$params = array();
		foreach (array_keys($allData) as $column)
		{
			// Check all the column name is permitted
			if (!$this->isColumnNameAllowed($column))
			{
				// Remove this from list
				unset($allData[$column]);
				echo sprintf("Unrecognised column `%s`\n", $column);
				continue;
			}

			$params[] = ':' . $column;
		}
		
		$dbh = $this->getDatabaseHandle();

		// Build the query
		$paramList = implode(', ', $params);
		$columnsList = implode(', ', array_keys($allData));
		$sql = "
			INSERT INTO
				scan
				(provider_id, time_start, time_end, {$columnsList})
			VALUES
				(1, 2, 3, $paramList)
		";

		// @todo Fix placeholder data!
		echo $sql . "\n";

		// Check the query is okay
		$stmt = $dbh->prepare($sql);
		if ($stmt === false)
		{
			print_r($dbh->errorInfo());
			die("Error: prepare error when recording data\n");
			exit();
		}

		// Finally, run the query
		$ok = $stmt->execute($allData);
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
				*
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

		$rows = $stmt->rowCount();
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

	protected function getDatabaseHandle()
	{
		static $dbh = null;

		if (!$dbh)
		{
			$dbh = new PDO('sqlite:' . $this->getDatabasePath());
		}

		return $dbh;
	}

	protected function getDatabasePath()
	{
		return $this->getRoot() . '/data/data.sqlite';
	}

	protected function isColumnNameAllowed($name)
	{
		$allowed = array(
			'allowance_remaining',
			'allowance_used',
			'balance',
			'last_updated',
			'usage_total'
		);

		return in_array($name, $allowed);
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

	protected function getLogPath()
	{
		return
			$this->getRoot() .
			'/logs/new/' . $this->getAccountIniValue('country') .
			'/' . $this->getAccountIniValue('provider')
		;
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

	protected function getRoot()
	{
		return $this->root;
	}

	/**
	 * Returns a value looked up from the system config file
	 * 
	 * @param string $key
	 * @return string
	 */
	protected function getSystemIniValue($key)
	{
		return $this->getIniValue('system.ini', $key);
	}

	/**
	 * Returns a value looked up from the account config file
	 * 
	 * @param string $key
	 * @return string
	 */
	protected function getAccountIniValue($key)
	{
		return $this->getIniValue('account.ini', $key);
	}

	protected function getIniValue($file, $key)
	{
		static $configData = false;

		if (!isset($configData[$file]))
		{
			$configFile = $this->getRoot() . '/configs/' . $file;
			$configData[$file] = parse_ini_file($configFile);			
		}

		return
			isset($configData[$file][$key]) ?
			$configData[$file][$key] :
			null
		;
	}
}