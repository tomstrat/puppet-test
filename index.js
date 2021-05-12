const puppeteer = require("puppeteer");
const fs = require("fs");
const fastcsv = require("fast-csv");

(async () => {

  const ws = fs.createWriteStream("out.csv");

  const dataToCsv = [];

  const write = (data) => {
    fastcsv.write(data, { headers: true }).pipe(ws);
  }

  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 250
  });
  // const browser = await puppeteer.launch();


  const page = await browser.newPage();
  await page.goto('http://database.ad.localpages.co.uk/index.php?target=books');

  //Change to Active
  await Promise.all([
    page.waitForNavigation(),
    page.click('#activeForm #goBut')
  ]);
  
  //GET OPTIONS
  const optionsHandle = await page.evaluateHandle(() => {
    return document.querySelectorAll("option");
  });

  const options = await page.evaluate(option => {
    const arr = [];
    option.forEach(op => {
      arr.push({value: op.value, text: op.innerHTML});
    });
    return arr;
  }, optionsHandle);
  
  //Remove redundant 0 from options
  options.shift();


  for(option of options){

    //Change to Option
    await Promise.all([
      page.waitForNavigation(),
      page.select('select', option.value)
    ]);

    //Change to Overview
    await Promise.all([
      page.waitForNavigation(),
      page.select('select', 'statoverview')
    ]);

    const pageData = await page.$$eval('.main-content tr', rows => {
      return Array.from(rows, row => {
        const columns = row.querySelectorAll('td');
        return Array.from(columns, column => column.innerText);
      });
    });

    for(let i = 0; i < 9; i++){
      pageData.shift();
    }

    pageData.forEach(r => {
      dataToCsv.push({
        book: option.text,
        company: r[0],
        categories: r[1],
        status: r[2],
        invoice: r[3],
        spend: r[4],
        comment: r[5],
        account: r[6]
      });
    });

    await Promise.all([
      page.waitForNavigation(),
      page.click('#backToBook')
    ]);
    await Promise.all([
      page.waitForNavigation(),
      page.click('#activeForm #goBut')
    ]);

  }
  write(dataToCsv);
  await browser.close();
})();
