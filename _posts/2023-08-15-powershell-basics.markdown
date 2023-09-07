---
layout: post
title: 
date: 2022-07-31 23:30:00 +0530
description: You’ll find this post in your `_posts` directory. Go ahead and edit it and re-build the site to see your changes. # Add post description (optional)
img: powershell.PNG?raw=true # Add image post (optional)
fig-caption: # Add figcaption (optional)
tags: [Powershell]
---
# Powershell Basics

## Declaring variables

$location = Get-Location

In this example we have declared the variable and stored current location into it.

$location \| Get-Member

This displays type, method and properties of the variable

## Arrays

$myList = @(0..4)

write-host("Print array")
$myList

write-host("Assign values")
$myList[1]  = 10
$myList

## Hashtables

$hash = @{ ID = 1; Shape = "Square"; Color = "Blue"}

write-host("Print all hashtable keys")
$hash.keys

write-host("Print all hashtable values")
$hash.values

write-host("Get ID")
$hash["ID"]

write-host("Get Shape")
$hash.Number

write-host("print Size")
$hash.Count

write-host("Add key-value")
$hash["Updated"] = "Now"

write-host("Add key-value")
$hash.Add("Created","Now")

write-host("print Size")
$hash.Count

write-host("Remove key-value")
$hash.Remove("Updated")

write-host("print Size")
$hash.Count

write-host("sort by key")
$hash.GetEnumerator() | Sort-Object -Property key

## Sort-Object and Format-Table

Get-Service * | Sort-Object ServiceType `
| Format-Table Name, ServiceType, Status -AutoSize

Get-Service | Format-List

## For loop

$array = @("item1", "item2", "item3")
foreach ($element in $array) { $element }
for($i = 0; $i -lt $array.length; $i++){ $array[$i] }

## If statement and Operator

$x = 10
if($x -le 20) {
  write-host("This is if statement")
}

## While loop

$myList = 5.6, 4.5, 3.3, 13.2, 4.0, 34.33, 34.0, 45.45, 99.993, 11123
write-host("using while Loop")
$i = 0
while($i -lt 4) {
   $myList[$i];
   $i++
}

## Switch statement

switch(3){
   1 {"One"}
   2 {"Two"}
   3 {"Three"}
   4 {"Four"}
   3 {"Three Again"}
}

## Working with files & folders

New-Item D:\temp\test\test.txt
Set-Content D:\temp\test\test.txt 'Welcome!!'
Get-Content D:\temp\test\test.txt
Add-Content D:\temp\test\test.txt 'Hello!'
Clear-Content D:\temp\test\test.txt

New-Item D:\temp\test\test.xml -ItemType File
Set-Content D:\temp\test\test.xml '<title>Welcome to TutorialsPoint</title>'

New-Item D:\temp\test\test.csv -ItemType File
Set-Content D:\temp\test\test.csv 'Mahesh,Suresh,Ramesh'

New-Item -Path 'D:\temp\Test Folder' -ItemType Directory
Copy-Item 'D:\temp\Test Folder' -Destination 'D:\temp\Test Folder1'
Copy-Item 'D:\temp\Test Folder\Test File.txt' 'D:\temp\Test Folder1\Test File1.txt'
Copy-Item -Filter *.txt -Path 'D:\temp\Test Folder' -Recurse -Destination 'D:\temp\Test Folder1'
Get-ChildItem -Name
Remove-Item 'D:\temp\Test Folder' -Recurse
Move-Item D:\temp\Test D:\temp\Test1
Rename-Item D:\temp\Test\test.txt test1.txt
(Get-Content D:\temp\test\test.txt).length
Test-Path D:\temp\test

## Compare files

Compare-Object -ReferenceObject $(Get-Content D:\temp\test\test.txt) -DifferenceObject $(Get-Content D:\temp\test\test1.txt) -IncludeEqual

## Searching through obeject

Get-Service | Where-Object {$_.Status -eq "Stopped"}
Get-Process | Where-Object {$_.ProcessName -Match "^p.*"}

## ForEach

1000,2000,3000 | ForEach-Object -Process {$_/1000}
"Microsoft.PowerShell.Core", "Microsoft.PowerShell.Host" | ForEach-Object {$_.Split(".")}

## Sleep

Start-Sleep -s 15
Start-Sleep -m 500

## Input & Output

$choice = Read-Host "Please put your choice"
Write-Host (2,4,6,8,10,12) -Separator ", -> " -ForegroundColor DarkGreen -BackgroundColor White

## Select & Sort object

Get-Process | Select-Object -Property ProcessName, Id, WS -Last 5
Get-Process | Sort-Object -Property WS | Select-Object -Last 5

## Invoke expression

$Command = 'Get-Process'
 
$Command
Get-Process
 
Invoke-Expression $Command 

Invoke-Item "D:\Temp\test.txt"

