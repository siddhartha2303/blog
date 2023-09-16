---
layout: post
title: 
date: 2022-07-31 23:30:00 +0530
description: You’ll find this post in your `_posts` directory. Go ahead and edit it and re-build the site to see your changes. # Add post description (optional)
img: pythonvspowershell.PNG?raw=true # Add image post (optional)
fig-caption: # Add figcaption (optional)
tags: [Powershell, Python]
---
## Python vs. Powershell


| Task                                      | PowerShell                                         | Python                                              |
|-------------------------------------------|----------------------------------------------------|-----------------------------------------------------|
| **Hello, World!**                         | ```Write-Host "Hello, World!"```                  | ```print("Hello, World!")```                      |
| **Variables**                             | ```$x = 5```                                      | ```x = 5```                                       |
|                                           | ```$y = "Hello"```                                | ```y = "Hello"```                                 |
| **Data Types**                            | ```$list_example = @(1, 2, 3)```                  | ```list_example = [1, 2, 3]```                    |
|                                           | ```$dict_example = @{'key' = 'value'}```           | ```dict_example = {'key': 'value'}```             |
| **Conditional Statements (if-else)**     | ```if ($x -gt 3) {```                            | ```if x > 3:```                                  |
|                                           | ```    Write-Host "x is greater than 3"```        | ```    print("x is greater than 3")```            |
|                                           | ```} else {```                                   | ```} else:```                                    |
|                                           | ```    Write-Host "x is not greater than 3"```    | ```    print("x is not greater than 3")```        |
| **Loops (for)**                           | ```for ($i = 0; $i -lt 5; $i++) {```              | ```for i in range(5):```                          |
|                                           | ```    Write-Host $i```                           | ```    print(i)```                               |
|                                           | ```}```                                          | ``````                                           |
| **Loops (while)**                         | ```$i = 0```                                      | ```i = 0```                                       |
|                                           | ```while ($i -lt 5) {```                        | ```while i < 5:```                               |
|                                           | ```    Write-Host $i```                           | ```    print(i)```                               |
|                                           | ```    $i++```                                   | ```    i += 1```                                  |
|                                           | ```}```                                          | ``````                                           |
| **Foreach Loop**                          | ```$numbers = @(1, 2, 3, 4)```                  | ```numbers = [1, 2, 3, 4]```                     |
|                                           | ```foreach ($number in $numbers) {```            | ```for number in numbers:```                      |
|                                           | ```    Write-Host $number```                      | ```    print(number)```                           |
|                                           | ```}```                                          | ``````                                           |
| **Foreach-Object**                        | ```$numbers | ForEach-Object {```                   | ```numbers = [1, 2, 3, 4]```                     |
|                                           | ```    Write-Host $_```                          | ```for number in numbers:```                      |
|                                           | ```}```                                          | ```    print(number)```                           |
| **For Each ($element in $collection)**   | ```$fruits = @("Apple", "Banana", "Cherry")```   | ```fruits = ["Apple", "Banana", "Cherry"]```     |
|                                           | ```foreach ($fruit in $fruits) {```             | ```for fruit in fruits:```                       |
|                                           | ```    Write-Host $fruit```                      | ```    print(fruit)```                            |
|                                           | ```}```                                          | ``````                                           |
| **Arrays**                                | ```$numbers = @(1, 2, 3, 4)```                  | ```numbers = [1, 2, 3, 4]```                     |
|                                           | ```$first_number = $numbers[0]```               | ```first_number = numbers[0]```                  |
| **Dictionaries**                          | ```$person = @{'name' = 'Alice'; 'age' = 30}``` | ```person = {'name': 'Alice', 'age': 30}```      |
|                                           | ```$name = $person['name']```                   | ```name = person['name']```                       |
| **I/O**                                   | ```$user_input = Read-Host "Enter something: "``` | ```user_input = input("Enter something: ")```    |
|                                           | ```Write-Host "You entered: $user_input"```     | ```print("You entered:", user_input)```           |
| **File Handling**                         | ```$content = Get-Content -Path 'file.txt'```   | ```with open('file.txt', 'r') as file:```         |
|                                           | ```Set-Content -Path 'file.txt' -Value "New text"``` | ```    content = file.read()```                    |
| **SSH Connection**                        | Via SSH cmdlets or SSH.NET library               | Requires external libraries (e.g., Paramiko for SSH) |
| **Working with JSON**                     | ```$data = @{```                                | ```import json```                                 |
|                                           | ```    name = "John"```                         | ```data = {'name': 'John', 'age': 30}```         |
|                                           | ```    age = 30```                              | ```json_string = json.dumps(data)```              |
|                                           | ```}```                                          | ``````                                           |
|                                           | ```$json_string = $data | ConvertTo-Json```      | ``````                                           |
| **Working with APIs (Advanced)**           | ```$base_url = "https://api.example.com"```     | ```import requests```                             |
|                                           | ```$endpoint = "/weather"```                    | ```headers = {"Authorization": "Bearer YOUR_API_KEY"}``` |
|                                           | ```$query_parameters = @{```                   | ```params = {"location": "New York"}```           |
|                                           | ```    "location" = "New York"```               | ``````                                           |
|                                           | ```}```                                          | ```try:```                                        |
|                                           | ```$headers = @{"Authorization" = "Bearer YOUR_API_KEY"}``` | ```    response = requests.get(base_url + endpoint, headers=headers, params=params)``` |
|                                           | ```try {```                                     | ```    response.raise_for_status()```              |
|                                           | ```    $response = Invoke-RestMethod -Uri ($base_url + $endpoint) -Method Get -Headers $headers -Query $query_parameters -ErrorAction Stop``` | ```    api_data = response.json()```               |
|                                           | ```} catch {```                                 | ```    print("Weather in New York:")```           |
|                                           | ```    Write-Host "Error: $_"```                | ```    print("Temperature:", api_data["temperature"])``` |
|                                           | ```    return```                                | ```except requests.exceptions.RequestException as e:``` |
| **Making a POST Request (Advanced)**      | ```$post_url = "https://api.example.com/data"``` | ```post_url = "https://api.example.com/data"```    |
|                                           | ```$post_headers = @{```                        | ```post_headers = {```                            |
|                                           | ```    "Api-Key" = "your_api_key_here"```       | ```    "Api-Key": "your_api_key_here"```          |
|                                           | ```}```                                          | ```}```                                           |
|                                           | ```$post_body = @{```                           | ```post_data = {```                               |
|                                           | ```    "key" = "value"```                      | ```    "key": "value"```                         |
|                                           | ```    "nested" = @{```                        | ```    "nested": {```                            |
|                                           | ```        "subkey" = "subvalue"```           | ```        "subkey": "subvalue"```               |
|                                           | ```    }```                                     | ```    }```                                       |
|                                           | ```}```                                          | ``````                                           |
|                                           | ```$post_json = $post_body | ConvertTo-Json```  | ```post_json = json.dumps(post_data)```           |
|                                           | ```$response = Invoke-RestMethod -Uri $post_url -Method Post -Headers $post_headers -Body $post_json -ContentType "application/json"``` | ```try:```                                        |
|                                           | ```$apiData = $response | ConvertFrom-Json```  | ```    response = requests.post(post_url, json=post_data, headers=post_headers)``` |
|                                           | ```$apiData.propertyName```                     | ```    api_data = response.json()```               |
