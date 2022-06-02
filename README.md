# Peerkart

## What is it?
Peerkart is an android app and web-app that allows users to put their grocery orders on the app and allows the creator to 
create, modify, delete, their orders. Other users who are willing can then deliver these orders where proximity filtered 
orders are shown to them, and earn some incentives. The app also allows filtering based on category, number of items, etc.

## How was it built?
The API supports complete CRUD operations and 
I built the API of this app using Node.js, Express.js framework. 
MongoDB was the primary database for the app while 
I used Redis for caching so that requests can be a little bit faster. 
For filtering the orders based on proximity, I have used Google Maps API along with geoJSON support on MongoDB.

The [web-app](https://github.com/Arsh-ak7/peerkart-frontend) was built using React Framework while the [android-app](https://github.com/Arsh-ak7/peerkartandroid/) was built using React-Native, by my friends
 
