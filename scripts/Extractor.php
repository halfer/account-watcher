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
		$matches = array();
		preg_match_all('/^\[data\]\s*(.+)\s*$/m', $logData, $matches);

		// Extract country/provider from log path, find the provider ID
		list($country, $provider) = $this->getLogDetails($logFile);
		$providerId = $this->getProviderId($country, $provider);

		// Retrieve the data from the parenthesis group
		if (isset($matches[1]))
		{
			$this->storeExtractedData($matches[1], $providerId);
		}
		else
		{
			echo "No data found";
		}

		// If ok, move the file to the done pile
		$this->moveToProcessedFolder($logFile);
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

	protected function storeExtractedData(array $jsonStrings, $providerId)
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
				(:provider_id, 0, 0, $paramList)
		";

		// FIXME Fix placeholder data for start/end dates!
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
