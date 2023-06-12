const fs = require("fs");
const path = require("path");
const puppeteer = require('puppeteer');
const handlebars = require("handlebars");
const wNumb = require("wnumb");
const fetch = require('node-fetch')
const yaml = require('js-yaml');
const luxon = require('luxon');

// /*------------------------------------------------------------*/
// Reading configuration env.yaml
let data;
try {
    let fileContents = fs.readFileSync('./env.yaml', 'utf8');
    data = yaml.load(fileContents);
} catch (e) {
    console.log(e);
}
const token = data.config.token + ":api_token";
const costumerKey = data.config.costumer_key;
const invoiceNumber = data.config.invoice_number;
const template = data.config.template;
const sinceDate = data.config.since;
const untilDate = data.config.until;
const workspaceId = data.config.workspace_id;
const userAgent = data.config.user_agent;
const wiseapi = data.config.wise_api;
const projects = data.config.projects;


// /*------------------------------------------------------------*/
//Current date

const date = new Date();
const day = date.getDate();
const month = date.toLocaleString('default', { month: 'short' });
const year = date.getFullYear();
const dateFormatted = day+'. '+month+' '+year;


const moneyFormat = wNumb({
  mark: '.',
  thousand: ',',
  prefix: '$ ',
  decimals: 2,
  suffix: ''
});

const moneyFormatEur = wNumb({
  mark: ',',
  thousand: '.',
  prefix: '€ ',
  decimals: 2,
  suffix: ''
});


try {
    (async () => {
        let summary,usdEurRatio;
        var dataBinding = {
            items: [
                {
                    "title": {
                        "time_entry": "Test default rate"
                    },
                    "time": 1830000,
                    "cur": null,
                    "sum": null,
                    "rate": null,
                    "local_start": "2022-12-13T13:46:00"
                },
                {
                    "title": {
                        "time_entry": "Test custom rate"
                    },
                    "time": 20885000,
                    "cur": null,
                    "sum": null,
                    "rate": 10,
                    "local_start": "2022-12-21T00:10:00"
                },
                {
                    "title": {
                        "time_entry": "Test dynamic time"
                    },
                    "time": 27 * (60000 * 60),
                    "cur": null,
                    "sum": null,
                    "rate": 40
                }
            ],
            total: 0,
            invoiceDate : dateFormatted
        }

      // /*------------------------------------------------------------*/
      // NOTE : We are not able to fetch user data and company biling info, because the account
      // we use for Toggl is Trial, we are not subscribed. I assume you are subscribed, so you just have to change
      // .env file to your workspace_id, and call this endpoint. You should get a subscription object in which you will
      // get all your billing info. 

      // fetch(`https://api.track.toggl.com/api/v9/workspaces/${workspaceId}`, {
      //     method: "GET",
      //     headers: {
      //         "Content-Type": "application/json",
      //         "Authorization": `Basic ${Buffer.from(token).toString('base64')}`
      //     },
      // })
      //     .then((resp) => resp.json())
      //     .then((json) => {
      //         console.log(json);
      //     })
      //     .catch(err => console.error(err));

      // /*------------------------------------------------------------*/
      // Toggle API integration example
      await fetch(`https://api.track.toggl.com/reports/api/v2/summary?workspace_id=${workspaceId}&user_agent=${userAgent}&project_ids=${projects.toString()}&until=${untilDate}&since=${sinceDate}`, {
        method: "GET",
        headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${Buffer.from(token).toString('base64')}`
        },
        })
        .then((resp) => resp.json())
        .then((json) => {
          summary = json;
        })
        .catch(err => console.error(err));


      // /*------------------------------------------------------------*/
      // Current USD to EUR rate

      await fetch("https://api.apilayer.com/exchangerates_data/convert?to=EUR&from=USD&amount=1", {
        method: 'GET',
        headers: {
        apikey : wiseapi
      }
        })
        .then(response => response.json())
        .then(result => usdEurRatio=result )
        .catch(err => console.error(err));

      // /*------------------------------------------------------------*/
      // Binding fetched items
      dataBinding.items = summary.data[0].items;

      // /*------------------------------------------------------------*/
      // Data binding

      dataBinding.items.forEach((item, i) => {
        const f = luxon.Duration.fromMillis(item.time).as('hours');
        let t = luxon.Duration.fromMillis(item.time).toFormat('hh:mm');
        const rate = item.rate ?? 90;
        if (t.length == 2) t = '00:'+t
        if (item.cur) {
          dataBinding.items[i]['duration'] = t
          dataBinding.items[i]['fractions'] = f
          dataBinding.items[i]['rate'] = rate
          dataBinding.items[i]['rateFormat'] = moneyFormat.to(rate)
          dataBinding.items[i]['total'] = f*rate;
          dataBinding.items[i]['totalFormat'] = moneyFormat.to(item.cur * item.sum)
          dataBinding.total += dataBinding.items[i]['total']

          // Formatting for smooth view
          dataBinding.items[i]['total'] = moneyFormat.to(dataBinding.items[i]['total']);
        }
        
      })

      dataBinding.totalFormat = moneyFormat.to(dataBinding.total)
      dataBinding.totalFormatEUR = moneyFormatEur.to(dataBinding.total * usdEurRatio)

        
        // /*------------------------------------------------------------*/
        // PDF rendering
        var templateHtml = fs.readFileSync(path.join(process.cwd(), 'src/html/invoice-dynamic.html'), 'utf8');
        var template = handlebars.compile(templateHtml);
        var finalHtml = encodeURIComponent(template(dataBinding));
        var options = {
            format: 'A4',
            headerTemplate: "<p></p>",
            footerTemplate: "<p></p>",
            displayHeaderFooter: false,
            margin: {
                top: "40px",
                bottom: "100px"
            },
            printBackground: true,
            path: 'invoice.pdf'
        }

        const browser = await puppeteer.launch({
            args: ['--no-sandbox'],
            headless: true
        });
        const page = await browser.newPage();
        await page.goto(`data:text/html;charset=UTF-8,${finalHtml}`, {
            waitUntil: 'networkidle2'
        });
        await page.pdf(options);
        await browser.close();

        console.log('Done: invoice.pdf is created!')
    })();
} catch (err) {
    console.log('ERROR:', err);
}
