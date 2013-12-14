<?php

$root = realpath(dirname(__FILE__));

require_once $root . '/scripts/Scanner.php';

$scanner = new Scanner($root);
$scanner->execute();
