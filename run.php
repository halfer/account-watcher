<?php

$root = realpath(dirname(__FILE__));

require_once $root . '/scripts/Scanner.php';
require_once $root . '/scripts/Extractor.php';

$scanner = new Scanner($root);
$scanner->execute();

$extractor = new Extractor($root);
$extractor->execute();
