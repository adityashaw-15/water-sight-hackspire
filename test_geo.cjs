const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--enable-features=NetworkService,NetworkServiceInProcess']
    });
    const context = browser.defaultBrowserContext();
    await context.overridePermissions('http://localhost:5000', ['geolocation']);
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    await page.setGeolocation({ latitude: 12.345, longitude: 54.321 });
    await page.goto('http://localhost:5000', {waitUntil: 'networkidle0'});
    console.log('On dashboard! Clicking Upload Evidence...');
    await page.click('button ::-p-text(Upload Evidence)');
    await page.waitForSelector('.upload-zone');
    
    // upload a file
    const [fileChooser] = await Promise.all([
        page.waitForFileChooser(),
        page.click('.upload-zone')
    ]);
    const fs = require('fs');
    fs.writeFileSync('test.png', 'fake image data');
    await fileChooser.accept(['test.png']);
    
    console.log('Clicking Submit Evidence...');
    
    console.log('Clicking Submit Evidence...');
    await page.click('button ::-p-text(Submit Evidence)');
    
    
    await new Promise(r => setTimeout(r, 4000));
    
    const isModalOpen = await page.evaluate(() => document.querySelector('.upload-modal') !== null);
    console.log('Is modal open after 4s?', isModalOpen);
    
    await browser.close();
    fs.unlinkSync('test.png');
})();
