var http = require('http');
var fs = require('fs');
var finalHandler = require('finalhandler');
var queryString = require('querystring');
var Router = require('router');
var bodyParser   = require('body-parser');
var uid = require('rand-token').uid;

const PORT = 3001;

//state holding variables
let brands = [];
let products = [];
let users = [];
let AUTH_USERS = [
  {
    email: 'salvador.jordan@example.com',
    token: 'thisismytokenyup'
  }
];

//Setup router
const myRouter = Router();
myRouter.use(bodyParser.json());

const server = http.createServer(function (request, response) {

  myRouter(request, response, finalHandler(request, response));

  //add in error on start-up check
  })
  .listen(PORT, error => {

    if (error) {
      return console.log("Error on Server Startup: ", error);
    }

    fs.readFile("./initial-data/users.json", "utf8", (error, data) => {
      if (error) throw error;
      users = JSON.parse(data);
      console.log(`Server setup: ${users.length} users loaded`);
    });

    fs.readFile("./initial-data/products.json", "utf8", (error, data) => {
      if (error) throw error;
      products = JSON.parse(data);
      console.log(`Server setup: ${products.length} products loaded`);
    });

    fs.readFile("./initial-data/brands.json", "utf8", (error, data) => {
      if (error) throw error;
      brands = JSON.parse(data);
      console.log(`Server setup: ${brands.length} brands loaded`);
    });

    console.log(`Server is listening on ${PORT}`);
  });

  //let's make some helper functions!
  const getAuthorizedUserFromToken = function(token){
    let userInfo = AUTH_USERS.find(authUser => {
      return authUser.token == token;
    });
    //we should probably return some sort of error if the token isn't found
    if (!userInfo) {
      return undefined;
    }

    return users.find((user) => {
      return user.email == userInfo.email;
    });
  }

  const getThingsFromRequestParams = function(requestUrl){
    //we'll have to deal with numbers above 10, so goodbye fixed URL substring
    const splitUrl = requestUrl.split('?');
    //we'll also grab our token
    return queryString.parse(splitUrl[1]);
  }

  const getProductFromProductId = function(productId){
    return products.find(product => {
      return product.id == productId;
    });
  }

  const updateCartWithProduct = function(token, productId, updateType, updateTotal = 1){
    const findUser = getAuthorizedUserFromToken(token);
    const findMyProduct = findUser.cart.find(shoppingCartItem => {
      return shoppingCartItem.product.id == productId;
    });

    if(updateTotal == undefined){
      updateTotal = 1;
    }

    if (findMyProduct === undefined && updateType === 'add'){
      const newCartUpdate = {
        product: getProductFromProductId(productId),
        quantity: updateTotal
      };

      findUser.cart.push(newCartUpdate)
      return newCartUpdate;
    } else if (findMyProduct === undefined && updateType === 'delete'){
      return null
    } else if (findMyProduct !== undefined && updateType === 'delete'){
      findMyProduct.quantity -= updateTotal;
      return findMyProduct;
    } else {
      findMyProduct.quantity += updateTotal;
      return findMyProduct;
    }
  }

  //base route
myRouter.get("/", (request, response) => {
  response.end("There's nothing to see here, please visit /api/brands and carry on.");
});

//public routes
myRouter.get("/api/brands", (request, response) => {
  response.writeHead(200, {
    'content-type': 'application/json'
  });
  response.end(JSON.stringify(brands));
});

//for this route, id is our brand's, and is referenced as a categoryId string within Product 
myRouter.get("/api/brands/:id/products", (request, response) => {
  const { id } = request.params;
  //check id data type is applicable
  if (!Number.isInteger(parseInt(id))){
    response.writeHead(404, 'id must be a number.');
    return response.end();
  }

  const productsOfSearchedBrand = products.filter(product => {
    return product.categoryId === id;
  })
  //check if brand ID exists
  if(productsOfSearchedBrand.length === 0){
    response.writeHead(404, "Brand not found.");
    return response.end();
  }

  response.writeHead(200, {
    'content-type': 'application/json'
  });
  response.end(JSON.stringify(productsOfSearchedBrand));
});

myRouter.get("/api/products", (request, response) => {
  response.writeHead(200, {
    'content-type': 'application/json'
  });
  response.end(JSON.stringify(products));
});

myRouter.post("/api/login", (request, response) => {
  //grab info from request body
  let { email, password } = request.body;
  
  if (typeof email !== 'undefined' && typeof password !== 'undefined') {
    //find user
    let user = users.find((user) => {
      return user.email == email && user.login.password == password;
    });
    //check for user existence, catching username/password errors
    if(!user){
      response.writeHead(401, "Invalid username or password");
      return response.end();
    }

    //hand out a token
    userToken = uid(16);

    response.writeHead(200, {
      'content-type': 'application/json'
    });
    return response.end(JSON.stringify({token: userToken}));

  } else {

    response.writeHead(400, "Incorrectly formatted request");
    return response.end();
  }
});

myRouter.get("/api/me/cart", (request, response) => {
  //let's grab the query token here
  const {token} = getThingsFromRequestParams(request.url);
  //and check if that query parameter exists
  if (typeof token !== 'undefined'){
    //check against our AUTH_USER object to grab the User based on token
    //we'll now use a helper function for getting our user
    const user = getAuthorizedUserFromToken(token);
    if (user === undefined) {
      response.writeHead(401, "Invalid or expired token");
      return response.end();
    }

    //send over our shopping cart
    response.writeHead(200, {
      'content-type': 'application/json'
    });
    return response.end(JSON.stringify(user.cart));

  } else {
    response.writeHead(400, "Incorrectly formatted request");
    return response.end();
  }
  
});

//start of POST cart items
myRouter.post("/api/me/cart", (request, response) => {

  //we'll grab our token
  const { token } = getThingsFromRequestParams(request.url);
  //checking if it exists and our request body for an id parameter
  if (typeof token !== 'undefined') {

    //let's check our body for an id key  
    if (!request.body.id) {
      response.writeHead(400, "Incorrectly formatted request");
      return response.end();
    } 
      
    const product = getProductFromProductId(request.body.id);

    if (!product) {
      response.writeHead(404, "Product not found.");
      return response.end();
    }

    //we'll now use a helper function for getting our user
    const user = getAuthorizedUserFromToken(token);
    if(user === undefined){
      response.writeHead(401, "Invalid or expired token");
      return response.end();
    }

    //push into User's cart, but now with helper function
    const cartUpdate = updateCartWithProduct(token, product.id, 'add');
    // user.cart.push(product);

    //at that point we'll have a positive response
    response.writeHead(200, {
      'content-type': 'application/json'
    });

    //return the item sent our way
    return response.end(JSON.stringify(cartUpdate));

  } else {
    //return error parameter if no token within query
    response.writeHead(400, "Incorrectly formatted request");
    return response.end();
  }
});

myRouter.post("/api/me/cart/:productId", (request, response) => {

  //we'll also grab our token
  const {token, total} = getThingsFromRequestParams(request.url);

  //checking if it exists and our request body for an id parameter
  if (typeof token !== 'undefined') {
    //let's snag our productId
    const { productId } = request.params;
    //and find that product!
    const product = getProductFromProductId(productId);

    if(product === undefined){
      response.writeHead(400, "Incorrectly formatted request");
      return response.end();
    }
    
    //we'll now use a helper function for getting our user
    const user = getAuthorizedUserFromToken(token);
    if (user === undefined) {
      response.writeHead(401, "Invalid or expired token");
      return response.end();
    }

    //push into User's cart, with helper function
    //let's check for our optional param here
    const cartUpdate = updateCartWithProduct(token, productId, 'add', total);


    // user.cart.push(product);

    //at that point we'll have a positive response
    response.writeHead(200, {
      'content-type': 'application/json'
    });

    //return the item sent our way
    return response.end(JSON.stringify(cartUpdate));
  } else {
    //return error parameter if no token within query
    response.writeHead(400, "Incorrectly formatted request");
    return response.end();
  }
});

myRouter.delete("/api/me/cart/:productId", (request, response) => {

  //we'll also grab our token
  const {token} = getThingsFromRequestParams(request.url);

  //checking if it exists and our request body for an id parameter
  if (typeof token !== 'undefined') {
    //let's snag our productId
    const { productId } = request.params;
    //and find that product!
    const product = getProductFromProductId(productId);

    if (product === undefined) {
      response.writeHead(400, "Incorrectly formatted request");
      return response.end();
    }

    //we'll now use a helper function for getting our user
    const user = getAuthorizedUserFromToken(token);
    if (user === undefined) {
      response.writeHead(401, "Invalid or expired token");
      return response.end();
    }

    //push into User's cart, with helper function
    const cartUpdate = updateCartWithProduct(token, productId, 'delete');
    // user.cart.push(product);
    if(cartUpdate === null){
      response.writeHead(204, "No content to be deleted.");
      return response.end();
    }

    //at that point we'll have a positive response
    response.writeHead(200, {
      'content-type': 'application/json'
    });

    //return the item sent our way
    return response.end(JSON.stringify(cartUpdate));
  } else {
    //return error parameter if no token within query
    response.writeHead(400, "Incorrectly formatted request");
    return response.end();
  }
});

//For testing, yo.
module.exports = server;