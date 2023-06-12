# Toggl Invoice Generator

![Toggl Logo](https://www.cpapracticeadvisor.com/wp-content/uploads/sites/2/2022/07/27659/logo_1_.59f9ec13e81a7.png)

This is an Invoice Generator for Toggle entries which I created for my Estonian client a year back.
It checks env.yaml fields **since** and **until**, which represent dates from which you want the invoice to be generated from. Application is also connected to **Wise API** so it calculates current dollar to EUR ration, in case you need it.
I didn't even bother hiding env variables. Just modify **env.yaml** file to your Toggl properties and it will work effortlessly.

**Please if this application ever helps you, leave a star. It will mean a lot to me.**

## How to run?

To run this invoice generator, do the following:

- Clone repository
- Install node packages from root folder with

```
npm install
```

- Position yourself in **src** folder
- Modify .env.yaml file
- Run command below to generate invoice

```
ts-node pdf.ts
```

After running this command, the message in terminal will appear, saying _Done: invoice.pdf is created!_. File named **invoice.pdf** will be generated in root folder.
