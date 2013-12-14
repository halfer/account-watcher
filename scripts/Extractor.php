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

		// Retrieve the data from the parenthesis group
		if (isset($matches[1]))
		{
			$this->storeExtractedData($matches[1]);
		}
		else
		{
			echo "No data found";
		}

		// @todo If ok, move the file to the done pile
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
}
