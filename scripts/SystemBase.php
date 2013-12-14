<?php

class SystemBase
{
	/**
	 * 
	 * @return type
	 */
	protected function getLogPath()
	{
		return
			$this->getRoot() .
			'/logs/new/' . $this->getAccountIniValue('country') .
			'/' . $this->getAccountIniValue('provider')
		;
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