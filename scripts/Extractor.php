<?php

require_once 'SystemBase.php';

class Extractor extends SystemBase
{
	protected $root;

	public function __construct($root)
	{
		$this->root = $root;
	}

	public function execute()
	{
		$iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($this->root . '/logs/new'));
		$regexIterator = new RegexIterator($iterator, '/^.+\.log$/i', RecursiveRegexIterator::GET_MATCH);
		foreach($regexIterator as $logFile => $object)
		{
			$this->extractData($logFile);
		}
	}

	/**
	 * Extracts data from the log file
	 */
	protected function extractData($logFile)
	{
		$logData = file_get_contents($logFile);
		$jsonStrings = $this->getJsonStrings($logData);
		list($startTime, $endTime) = $this->getLogTimes($logData);

		// Extract country/provider from log path, find the provider ID
		list($country, $provider) = $this->getLogDetails($logFile);
		$providerId = $this->getProviderId($country, $provider);

		// Retrieve the data from the parenthesis group
		if (isset($jsonStrings))
		{
			$this->storeExtractedData($jsonStrings, $providerId, $startTime, $endTime);
		}
		else
		{
			echo "No data found";
		}

		// If ok, move the file to the done pile
		$this->moveToProcessedFolder($logFile);
	}

	protected function getJsonStrings($logData)
	{
		$matches = array();
		preg_match_all('/^\[data\]\s*(.+)\s*$/m', $logData, $matches);

		return isset($matches[1]) ? $matches[1] : null;
	}

	protected function getLogDetails($logFile)
	{
		$logPath = $this->getRoot() . '/logs/new';
		$relativePath = substr($logFile, strlen($logPath));

		// Grab the country and the provider string
		$matches = array();
		preg_match('/^\/([a-z0-9]+)\/([a-z0-9]+)\//i', $relativePath, $matches);

		return array($matches[1], $matches[2],);
	}

	protected function getProviderId($country, $provider)
	{
		$dbh = $this->getDatabaseHandle();
		$sql = "SELECT id FROM provider WHERE country = :country AND name = :provider";
		$stmt = $dbh->prepare($sql);
		if ($stmt === false)
		{
			echo "Can't prepare provider search\n";
		}

		$ok = $stmt->execute(array(':country' => $country, ':provider' => $provider,));
		if (!$ok)
		{
			echo "Can't run provider search\n";
		}

		$id = $stmt->fetchColumn();

		return $id;
	}

	protected function getLogTimes($logData)
	{
		$matches = array();
		$startTime = $endTime = null;

		preg_match('/^\[start-time\]\s*(.+)\s*$/m', $logData, $matches);
		if (isset($matches[1]))
		{
			$startTime = strtotime($matches[1]);
		}
		else
		{
			echo "Warning: start time not found in log";
		}

		preg_match('/^\[exit-time\]\s*(.+)\s*$/m', $logData, $matches);
		if (isset($matches[1]))
		{
			$endTime = strtotime($matches[1]);
		}
		else
		{
			echo "Warning: end time not found in log";
		}

		return array($startTime, $endTime);
	}

	protected function storeExtractedData(array $jsonStrings, $providerId, $startTime, $endTime)
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
				(:provider_id, :start_time, :end_time, $paramList)
		";

		echo $sql . "\n";

		// Check the query is okay
		$stmt = $dbh->prepare($sql);
		if ($stmt === false)
		{
			print_r($dbh->errorInfo());
			die("Error: prepare error when recording data\n");
			exit();
		}

		// Set up some parameters not from the log file
		$allData['provider_id'] = $providerId;
		$allData['start_time'] = $startTime;
		$allData['end_time'] = $endTime;

		print_r($allData);

		// Finally, run the query
		$ok = $stmt->execute($allData);
	}

	protected function moveToProcessedFolder($logFile)
	{
		// This results in a relative file reference, e.g. "/uk/orange/1381943492.log"
		$newFolder = $this->getRoot() . '/logs/new';
		$relative = substr($logFile, strlen($newFolder));
		$destination = $this->getRoot() . '/logs/processed' . $relative;

		// Ensure the directory exists
		@mkdir(dirname($destination), 0711, $_recursive = true);

		// Do the rename, and check it
		$ok = rename($logFile, $destination);
		if (!$ok)
		{
			echo "Error: rename failed\n";
		}
	}
}
