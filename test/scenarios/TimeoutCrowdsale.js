var QuantstampSale = artifacts.require("./QuantstampSale.sol");
var QuantstampToken = artifacts.require("./QuantstampToken.sol");

var QuantstampSaleMock = artifacts.require('./helpers/QuantstampSaleMock.sol');



var bigInt = require("big-integer");



const timeTravel = function (time) {
  return new Promise((resolve, reject) => {
    web3.currentProvider.sendAsync({
      jsonrpc: "2.0",
      method: "evm_increaseTime",
      params: [time], // 86400 is num seconds in day
      id: new Date().getTime()
    }, (err, result) => {
      if(err){ return reject(err) }
      return resolve(result)
    });
  })
}


async function logUserBalances (token, accounts) {
 console.log("")
 console.log("User Balances:")
 console.log("--------------")
 console.log(`Owner: ${(await token.balanceOf(accounts[0])).toNumber()}`)
 console.log(`User1: ${(await token.balanceOf(accounts[1])).toNumber()}`)
 console.log(`User2: ${(await token.balanceOf(accounts[2])).toNumber()}`)
 console.log(`User3: ${(await token.balanceOf(accounts[3])).toNumber()}`)

 console.log("--------------")
 console.log("")
}

async function logEthBalances (token, sale, accounts) {
 console.log("")
 console.log("Eth Balances:")
 console.log("-------------")
 console.log(`Owner: ${(await web3.eth.getBalance(accounts[0])).toNumber()}`)
 console.log(`User1: ${(await web3.eth.getBalance(accounts[1])).toNumber()}`)
 console.log(`User2: ${(await web3.eth.getBalance(accounts[2])).toNumber()}`)
 console.log(`User3: ${(await web3.eth.getBalance(accounts[3])).toNumber()}`)
 console.log(`Sale : ${(await web3.eth.getBalance(sale.address)).toNumber()}`)
 console.log(`Token: ${(await web3.eth.getBalance(token.address)).toNumber()}`)

 console.log("--------------")
 console.log("")
}





contract('Missed-deadline Crowdsale', function(accounts) {
  // account[0] points to the owner on the testRPC setup
  var owner = accounts[0];
  var user1 = accounts[1];
  var user2 = accounts[2];
  var user3 = accounts[3];

  var sale2;

  beforeEach(function() {
    return QuantstampSale.deployed().then(function(instance) {
        sale = instance;
        return QuantstampToken.deployed();
    }).then(function(instance2){
      token = instance2;
      return token.INITIAL_SUPPLY();
    }).then(function(val){
      initialSupply = val.toNumber();
      return sale.rate();
    }).then(function(val){
      rate = val.toNumber();
      return token.owner();
    }).then(function(owner){
      tokenOwner = owner;
      return token.CROWDSALE_ALLOWANCE();
    }).then(function(val){
      crowdsaleSupply = val.toNumber();
    });
  });

  it("should accept 2 ether for the crowdsale", async function() {
      // 0 indicates all crowdsale tokens
      await token.setCrowdsale(sale.address, 0); // ensures crowdsale has allowance of tokens

      var amountEther = 2;
      var amountWei = web3.toWei(amountEther, "ether");

      let allowance = (await token.allowance(tokenOwner, sale.address)).toNumber();

      await sale.sendTransaction({from: user2,  value: web3.toWei(amountEther, "ether")});

      let allowanceAfter = (await token.allowance(tokenOwner, sale.address)).toNumber();
      let user2BalanceAfter = (await token.balanceOf(user2)).toNumber();
      let ownerBalanceAfter = (await token.balanceOf(owner)).toNumber();

      assert.equal(allowance - (amountWei * rate), allowanceAfter, "The crowdsale should have sent amountWei*rate miniQSP");
      assert.equal(user2BalanceAfter, amountWei * rate, "The user should have gained amountWei*rate miniQSP");
      assert.equal(allowanceAfter + user2BalanceAfter, allowance, "The total tokens should remain the same");
  });

  it("should not allow the purchase of tokens if the deadline is reached", async function() {
      // 0 indicates all crowdsale tokens
      var time = (new Date().getTime() / 1000);
      var futureTime = time + 130;

      var amountEther = 2;
      var amountWei = web3.toWei(amountEther, "ether");

      let sale2 = await QuantstampSaleMock.new(accounts[1], 10, 20, 1, time, 2, 5000, token.address);
      await token.setCrowdsale(sale2.address, 0); // ensures crowdsale has allowance of tokens

      let nowtest = await sale2._now();

      let currentTime = (await sale2.currentTime());
      //let startTime = (await sale2.)

      currentTime = currentTime.toNumber();
      let endTime = await sale2.endTime();

      await sale2.sendTransaction({from: user2,  value: web3.toWei(amountEther, "ether")});

      await sale2.changeTime(futureTime);

      let afterTime = (await sale2.currentTime());

      try{
          await sale2.sendTransaction({from: user2,  value: web3.toWei(amountEther, "ether")});
      }
      catch (e){
        return true;
      }
      throw new Error("a user sent funds after the deadline");
  });



});
