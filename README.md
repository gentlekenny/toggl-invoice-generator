# Toggl Invoice Generator

![Toggl Logo](https://play-lh.googleusercontent.com/PeblLXajnpQMBdnzHCQ9yRh6IZ1iOM7qqJkp306uOYlYq8djKFs2vTLO5YO265MPmcM)

This is an Invoice Generator for Toggle entries which I created for my Estonian client a year back.
I didn't even bother hiding env variables so you can test it. Just modify **env.yaml** file to your Toggl properties and it will work effortlessly.

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

After running this command, the message in terminal will appear, saying _Done: invoice.pdf is created!_. File named **invoice.pdf** will be generated in folder root.
