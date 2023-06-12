import { readFileSync } from "fs";
import { join } from "path";
import puppeteer, { PDFOptions } from 'puppeteer';
import { compile } from "handlebars";
import wNumb from "wnumb";
import fetch from 'node-fetch';
import { load } from 'js-yaml';
import { Duration } from 'luxon';

// /*------------------------------------------------------------*/
// Interfaces

interface UserRecord {
    title: {
        time_entry: string
    },
    time: number,
    cur: any,
    sum: any,
    rate: number,
    local_start: string,
    duration?: string,
    fractions?: number,
    rateFormat?: any,
    total?: number
    totalFormat?: string
}

interface BindingInterface {
    items: UserRecord[],
    total: number,
    invoiceDate: string,
    totalFormat: string,
    totalFormatEUR: string,
    invoiceNumber: number,
    companyFields: Object,
    companyInfo: Object,
    footerFields: Object,
    accountInfo: Object
}


// /*------------------------------------------------------------*/
// Reading configuration env.yaml
let data: any;
try {
    let fileContents = readFileSync('./env.yaml', 'utf8');
    data = load(fileContents);
} catch (e) {
    console.log(e);
}
const token = data.config.token + ":api_token";
const invoiceNumber = data.config.invoice_number;
const template = data.config.template;
const sinceDate = data.config.since;
const untilDate = data.config.until;
const workspaceId = data.config.workspace_id;
const userAgent = data.config.user_agent;
const wiseapi = data.config.wise_api;
const projects = data.config.projects;
const companyFields = data.config.companyFields;
const companyInfo = data.config.companyInfo;
const footerFields = data.config.footerFields;
const accountInfo = data.config.accountInfo;

// /*------------------------------------------------------------*/
//Current date

const date = new Date();
const day = date.getDate();
const month = date.toLocaleString('default', { month: 'short' });
const year = date.getFullYear();
const dateFormatted = day + '. ' + month + ' ' + year;


const moneyFormat: any = wNumb({
    mark: '.',
    thousand: ',',
    prefix: '$ ',
    decimals: 2,
    suffix: ''
});

const moneyFormatEur: any = wNumb({
    mark: ',',
    thousand: '.',
    prefix: '€ ',
    decimals: 2,
    suffix: ''
});

// * ------------------------------------------------------------* /
// Functions
const getSummary = async () => await fetch(`https://api.track.toggl.com/reports/api/v2/summary?workspace_id=${workspaceId}&user_agent=${userAgent}&project_ids=${projects.toString()}&until=${untilDate}&since=${sinceDate}`, {
    method: "GET",
    headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${Buffer.from(token).toString('base64')}`
    },
})
    .then((resp) => resp.json())
    .catch(err => console.error(err));

// * ------------------------------------------------------------* /
// ExchangeRate function, for some reason it is not working when called alone
const getExchangeRate = async () => await fetch("https://api.apilayer.com/exchangerates_data/convert?to=EUR&from=USD&amount=1", {
    method: 'GET',
    headers: {
        apikey: wiseapi
    }
})
    .then(response => response.json())
    .catch(err => console.error(err));

// * ------------------------------------------------------------* /
// DataBinding function
const bindData = (dataBinding: BindingInterface, usdEurRatio: number) => {
    dataBinding.items.forEach((item: UserRecord, i: number) => {
        const f = Duration.fromMillis(item.time).as('hours');
        let t = Duration.fromMillis(item.time).toFormat('hh:mm');
        const rate = item.rate ?? 90;
        if (t.length == 2) t = '00:' + t
        if (item.cur) {
            dataBinding.items[i]['duration'] = t
            dataBinding.items[i]['fractions'] = f
            dataBinding.items[i]['rate'] = rate
            dataBinding.items[i]['rateFormat'] = moneyFormat.to(rate)
            dataBinding.items[i]['total'] = f * rate;
            dataBinding.items[i]['totalFormat'] = moneyFormat.to(item.cur * item.sum!)
            dataBinding.total += dataBinding.items[i]['total']!

            // Formatting for smooth view
            dataBinding.items[i]['total'] = moneyFormat.to(dataBinding.items[i]['total']);
        }

    })

    dataBinding.totalFormat = moneyFormat.to(dataBinding.total)
    dataBinding.totalFormatEUR = moneyFormatEur.to(dataBinding.total * usdEurRatio)
}

// * ------------------------------------------------------------* /
// PDF Rendering function
const renderPDF = async (dataBinding: BindingInterface, templateChoice: string) => {
    var templateHtml = readFileSync(join(process.cwd(), 'src/html/' + templateChoice), 'utf8');
    var template = compile(templateHtml);
    var finalHtml = encodeURIComponent(template(dataBinding));
    var options: Partial<PDFOptions> = {
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
    await page.goto(`data:text/html;charset=utf-8,${finalHtml}`, {
        waitUntil: 'networkidle2'
    });
    await page.pdf(options);
    await browser.close();

    console.log('Done: invoice.pdf is created!')
}

//-------------------------------------main------------------------------//

try {
    (async () => {
        let summary: any;
        let usdEurRatio: number = 0;
        var dataBinding: BindingInterface = {

            // Didn't want to delete this default state
            items: [
                {
                    "title": {
                        "time_entry": "Test default rate"
                    },
                    "time": 1830000,
                    "cur": null,
                    "sum": null,
                    "rate": 1,
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
                    "rate": 40,
                    "local_start": "2022-12-21T00:10:00"
                }
            ],
            total: 0,
            invoiceDate: dateFormatted,
            totalFormat: '',
            totalFormatEUR: '',
            invoiceNumber: invoiceNumber,
            companyFields: companyFields,
            companyInfo: companyInfo,
            accountInfo: accountInfo,
            footerFields: footerFields
        }

        //Calling function to get project billing summary

        await getSummary().then(res => summary = res);

        // /*------------------------------------------------------------*/
        // Current USD to EUR rate
        await getExchangeRate().then(res => usdEurRatio = res)

        // /*------------------------------------------------------------*/
        // Binding fetched items
        dataBinding.items = summary.data[0].items;

        // /*------------------------------------------------------------*/
        // Data binding
        bindData(dataBinding, usdEurRatio);


        // /*------------------------------------------------------------*/
        // PDF rendering
        renderPDF(dataBinding, template);

    })();
} catch (err) {
    console.log('ERROR:', err);
}
