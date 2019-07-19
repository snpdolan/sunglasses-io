let chai = require('chai');
let chaiHttp = require('chai-http');
let server = require('../server');

let should = chai.should();

chai.use(chaiHttp);

describe('Brands', () => {

  //basic initial GET for Brands
  describe('/GET brands', () =>{
    it('it should GET all the brands', done => {
      //arrange
      chai
        .request(server)
        .get('/api/brands')
        .end((err, res) => {
          //assert
          res.should.have.status(200);
          res.body.should.be.an('array');
          res.body.length.should.be.eql(5);
          done();
        })
    });
  });

  //tests for brands/:id/products
  describe('/GET brands/{id}/products', () => {
    //grab the initial value to make the test pass
    it('it should GET all the products for brand Id given', done => {
      //arrange
      chai
        .request(server)
        .get('/api/brands/1/products')
        .end((err, res) => {
          //assert
          res.should.have.status(200);
          res.body.should.be.an('array');
          res.body.length.should.be.eql(3);
          done();
        })
    });
    //test to check that brand Id actually exists with our initial data
    it('it should return an error if the brand Id does not exist', done => {
      //arrange
      chai
        .request(server)
        .get('/api/brands/8/products')
        .end((err, res) => {
          //assert
          res.should.have.status(404);
          done();
        })
    });

    //test to check that brand Id is an appropriate character type

  });

});

describe('Products', () => {
  describe('/GET products', () => {
    it('it should GET all the products', done => {
      //arrange
      chai
        .request(server)
        .get('/api/products')
        .end((err, res) => {
          //assert
          res.should.have.status(200);
          res.body.should.be.an('array');
          res.body.length.should.be.eql(11);
          done();
        })
    });
  });
});