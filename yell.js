//var casper = require('casper').create();
var casper = require('casper').create({
    clientScripts: ['lib/jquery.min.js'], // Inject jquery library, allows use of $ variables
    verbose: true,
    logLevel: 'error',
    pageSettings: {
        loadImages: false,
        loadPlugins: false,
        //userAgent: 'Mozilla/5.0 (Windows NT 6.2; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.2 Safari/537.36'
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X'
    }

});

var x = require('casper').selectXPath;
var webpage = 'https://www.yell.com/';
if(casper.cli.has("keyword")){
    var keyword = casper.cli.get("keyword");
} else{
    casper.die("No Keyword spesified.", 1);
}
var locationName = 'Cumbria';
var seperator = '\t';
var fs = require('fs');
var companiesPerPage = 15;
var baseUrl = 'https://www.yell.com';
var catLinks = [];
var isSubCats;
if(casper.cli.has("iscat")){
    isSubCats = casper.cli.get(iscat);
} else{
    isSubCats = '0';
}


casper.start(webpage, function () {
    search();
});

casper.then(function () {
    //fs.close();
    this.echo('DONE !!');
});

// initiate the search page
function initiate() {
    casper.then(function () {
        this.sendKeys('#search_keyword', keyword); // enter keyword
        this.echo('Keyword Entered: ' + keyword);
    });

    casper.wait(2000, function () {
        this.sendKeys('#search_location', locationName); // enter location
        this.echo('Location Entered: ' + locationName);
    });

    casper.wait(5000, function () {
        casper.capture('img/search-params.png');
        this.echo('search Image captured');
    });

    casper.thenClick(x('//*[@id="searchBoxForm"]/div[1]/fieldset/div[5]/button'), function () { // click the search button
        this.echo('Searching started !');
    });

    casper.wait(5000, function () { // capture the initial page screenshot
        casper.capture('img/result.jpg');
        this.echo('result image captured');
    });

    casper.thenClick(x('//*[@id="AdvancedSearch--open"]/a'), function () { // click advanced search
        this.echo('Clicked advanced search');
    });

    casper.wait(3000, function () { // capture advanced search popup
        casper.capture('img/searchPopup.jpg');
    });

    casper.thenClick(x('//*[@id="filterWebsite"]'), function () { // tick websites filter
        this.echo('Filter By Website ticked');
    });

    casper.thenClick(x('//*[@id="advancedSearch-submit"]'), function () { // submit the advanced search button
        this.echo('Clicked search button');
    });

    casper.wait(6000, function () { // capture advanced search result
        casper.capture('img/ad-result.jpg');
        fs.write("export/" + keyword + ".csv", 'Name' + seperator + 'URL' + seperator + 'Phone' + seperator + 'Address' + seperator + 'Town' + seperator + 'City' + seperator + 'Post' + "\n", "a");
    });
}



function getCatLinks(){
    var categoryLinks = casper.evaluate(function () { // get all available category links
        var nodes = document.querySelectorAll('.sortBy--container .sortBy-column');
        return Array.prototype.map.call(nodes, function (node, i) {
            var html = node.querySelector('.sortBy--title').innerHTML.trim();
            if (html == 'Category') {
                var lis = node.querySelectorAll('ul li');
                return Array.prototype.map.call(lis, function (li, i) {
                    return li.querySelector('.sortBy--link').getAttribute('href');
                });
            } else {
                return false;
            }
        });
    });
    return categoryLinks;
}

function getRandomIntFromRange(min, max) {
    return Math.round(Math.random() * (max - min)) + min;
}

function navigation(){
    var currentUrl;
    var pages;

    casper.wait(2000, function () { // get the total page count
        var countText = casper.fetchText(x('/html/body/div[4]/div/div[1]/div[1]/div[2]/div[1]/button'));
        var count = (countText.match(/\d+/)[0]) / companiesPerPage;

        if (Math.floor(count)) {
            pages = Math.ceil(count);
        } else {
            pages = 0;
        }
    });

    casper.then(function () {
        currentUrl = this.getCurrentUrl();
        this.echo('Total Page count: ' + pages);

        this.echo('scrapeing page: 1');
        casper.capture('img/page1.jpg');
        this.echo('######################################');

        getData(); // get company data of first page

        for (i = 2; i <= pages; i++) {
            delay = getRandomIntFromRange(8000, 15000); // set random interval
            this.wait(delay, (function (j, d) {
                return function () {
                    this.echo('page ' + j + '; delay in milliseconds: ' + d);
                    var newUrl = currentUrl + '&pageNum=' + j; // generate next page

                    casper.thenOpen(newUrl); // open next page

                    this.echo('######################################');
                    this.echo(newUrl);
                    this.echo('scraping page: ' + (j));
                    this.echo('-------------------------------');
                    casper.capture('img/page' + (j) + '.jpg');

                    getData();// get company data of first page
                };
            })(i, delay));
        }
    });
}

function search() {
    initiate(); // initiate the search page for given parameters

    if(isSubCats != '0'){ // if you need to go sub category wise
        casper.thenClick(x('/html/body/div[4]/div/div[1]/div[1]/div[2]/div[1]/button'), function () {
            this.echo('Category menu clicked');
        });

        casper.then(function(){
            k=0;
            var links = getCatLinks();
            for( i = 0; i < links.length;i++){
                for( j = 0; j < links[i].length; j++){
                    if(links[i][j] != '' ){
                        catLinks[k++] = baseUrl+links[i][j]; // save all category links to catLinks array
                    }
                }
            }
        });

        casper.then(function(){
            if(catLinks.length){
                casper.then(function(){ // iterate through categories and scrape each page
                    this.echo('Total category count: '+ catLinks.length);
                    for(i = 0; i < catLinks.length; i++){
                        delay = getRandomIntFromRange(14000, 16000); // set random interval
                        this.wait(delay, (function (j, d) {
                            return function () {
                                this.echo('category ' + j + '; delay in milliseconds: ' + d);
                                casper.thenOpen(catLinks[j]);
                                casper.then(function(){
                                    this.echo('######################################');
                                    this.echo(this.getCurrentUrl());
                                    this.echo('scraping category: ' + (j));
                                    casper.capture('img/category' + (j) + '.jpg');
                                    this.echo('Image captured for category: '+j);
                                    this.echo('-------------------------------');

                                });
                                casper.then(function(){
                                    navigation(); // navigate through pagination of current page
                                });

                            };
                        })(i, delay));
                    }
                });
            }

        });


    }
    else { // if you do not need to go sub category wise
        navigation(); // navigate through pagination of current page
    }


}



function getData() { // for getting company data from current page
    casper.then(function () {
        var data = this.evaluate(function () {
            var nodes = document.querySelectorAll('div.serp--capsuleList > div.col-sm-24'); // dive into company container
            return Array.prototype.map.call(nodes, function (node, i) {

                var url = '',
                    phone = '',
                    address = '',
                    town = '',
                    city = '',
                    post = '';

                if (node.querySelector('a[itemprop=url]')) {
                    url = node.querySelector('a[itemprop=url]').getAttribute('href');
                }
                if (node.querySelector('strong[itemprop="telephone"]')) {
                    phone = node.querySelector('strong[itemprop="telephone"]').innerHTML.trim();
                }
                if (node.querySelector('span[itemprop="streetAddress"]')) {
                    address = node.querySelector('span[itemprop="streetAddress"]').innerHTML.trim();
                }
                if (node.querySelector('span[itemprop="addressLocality"]')) {
                    town = node.querySelector('span[itemprop="addressLocality"]').innerHTML.trim();
                }
                if (node.querySelector('span[itemprop="addressRegion"]')) {
                    city = node.querySelector('span[itemprop="addressRegion"]').innerHTML.trim();
                }
                if (node.querySelector('span[itemprop="postalCode"]')) {
                    post = node.querySelector('span[itemprop="postalCode"]').innerHTML.trim();
                }
                return {
                    name: node.querySelector('h2').innerHTML.trim(),
                    url: url,
                    phone: phone,
                    address: address,
                    town: town,
                    city: city,
                    post: post

                };
            })
        });

        for (var i = 0; i < data.length; i++) {
            this.echo('name: ' + data[i]['name']);
            this.echo('url: ' + data[i]['url']);
            this.echo('phone: ' + data[i]['phone']);
            this.echo('address: ' + data[i]['address']);
            this.echo('town: ' + data[i]['town']);
            this.echo('city: ' + data[i]['city']);
            this.echo('post: ' + data[i]['post']);
            this.echo('-------------------------------');

            fs.write("export/" + keyword + ".csv", data[i]['name'] + seperator + data[i]['url'] + seperator + data[i]['phone'] + seperator + data[i]['address'] + seperator + data[i]['town'] + seperator + data[i]['city'] + seperator + data[i]['post'] + "\n", "a");
        }
    });
}

casper.run();
