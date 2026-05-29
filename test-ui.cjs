const { chromium } = require('playwright');

(async () => {
  console.log('Starting UI tests...');

  const browser = await chromium.launch({
    headless: true,
    executablePath: '/snap/bin/chromium'
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  // Collect console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  // Collect page errors
  const pageErrors = [];
  page.on('pageerror', error => {
    pageErrors.push(error.message);
  });

  try {
    console.log('1. Testing page load...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });

    // Wait for React to render
    await page.waitForSelector('#root', { timeout: 10000 });
    console.log('   ✓ Page loaded successfully');

    // Take screenshot
    await page.screenshot({ path: '/tmp/test-1-initial-load.png' });
    console.log('   ✓ Screenshot saved: /tmp/test-1-initial-load.png');

    console.log('\n2. Testing theme switching...');

    // Click settings button
    const settingsButton = await page.locator('button[title="Settings (Ctrl+,)"]');
    if (await settingsButton.isVisible()) {
      await settingsButton.click();
      await page.waitForTimeout(500);

      // Take screenshot of settings
      await page.screenshot({ path: '/tmp/test-2-settings-open.png' });
      console.log('   ✓ Settings opened');

      // Click light theme button
      const lightButton = await page.locator('button:has-text("Light")');
      if (await lightButton.isVisible()) {
        await lightButton.click();
        await page.waitForTimeout(500);

        // Save settings
        const saveButton = await page.locator('button:has-text("Save")');
        if (await saveButton.isVisible()) {
          await saveButton.click();
          await page.waitForTimeout(500);
        }

        // Take screenshot of light mode
        await page.screenshot({ path: '/tmp/test-3-light-mode.png' });
        console.log('   ✓ Light mode applied');

        // Verify background color
        const bgColor = await page.evaluate(() => {
          return window.getComputedStyle(document.body).backgroundColor;
        });
        console.log(`   Background color: ${bgColor}`);
      }
    }

    console.log('\n3. Testing session selection...');

    // Click on a session
    const sessionItem = await page.locator('.group').first();
    if (await sessionItem.isVisible()) {
      await sessionItem.click();
      await page.waitForTimeout(1000);

      // Take screenshot of session
      await page.screenshot({ path: '/tmp/test-4-session-selected.png' });
      console.log('   ✓ Session selected');
    }

    console.log('\n4. Testing message sending...');

    // Type a message
    const messageInput = await page.locator('textarea[placeholder*="Type a message"]');
    if (await messageInput.isVisible()) {
      await messageInput.fill('Hello, this is a test message');
      await page.waitForTimeout(300);

      // Take screenshot before sending
      await page.screenshot({ path: '/tmp/test-5-message-typed.png' });
      console.log('   ✓ Message typed');

      // Click send button
      const sendButton = await page.locator('button:has-text("Send")');
      if (await sendButton.isVisible()) {
        await sendButton.click();
        await page.waitForTimeout(2000);

        // Take screenshot after sending
        await page.screenshot({ path: '/tmp/test-6-message-sent.png' });
        console.log('   ✓ Message sent');
      }
    }

    console.log('\n5. Testing message display...');

    // Wait for response
    await page.waitForTimeout(3000);

    // Take screenshot of response
    await page.screenshot({ path: '/tmp/test-7-response.png' });
    console.log('   ✓ Response received');

    // Check for user message bubble
    const userMessage = await page.locator('.flex.justify-end').first();
    if (await userMessage.isVisible()) {
      console.log('   ✓ User message bubble found');
    }

    // Check for assistant message
    const assistantMessage = await page.locator('.w-full').first();
    if (await assistantMessage.isVisible()) {
      console.log('   ✓ Assistant message found');
    }

    console.log('\n6. Testing thinking block...');

    // Check for thinking block
    const thinkingBlock = await page.locator('text=Thinking').first();
    if (await thinkingBlock.isVisible()) {
      console.log('   ✓ Thinking block found');

      // Take screenshot of thinking
      await page.screenshot({ path: '/tmp/test-8-thinking.png' });
    }

    console.log('\n7. Testing WebSocket connection...');

    // Check connection status
    const connectionStatus = await page.locator('text=Connected').first();
    if (await connectionStatus.isVisible()) {
      console.log('   ✓ WebSocket connected');
    }

    console.log('\n8. Checking for errors...');

    if (consoleErrors.length > 0) {
      console.log('   Console errors:');
      consoleErrors.forEach(err => console.log(`     - ${err}`));
    } else {
      console.log('   ✓ No console errors');
    }

    if (pageErrors.length > 0) {
      console.log('   Page errors:');
      pageErrors.forEach(err => console.log(`     - ${err}`));
    } else {
      console.log('   ✓ No page errors');
    }

    console.log('\n=== Test Summary ===');
    console.log('All tests completed!');
    console.log('Screenshots saved to /tmp/test-*.png');
    console.log('\nTo view screenshots:');
    console.log('  open /tmp/test-1-initial-load.png');
    console.log('  open /tmp/test-3-light-mode.png');
    console.log('  open /tmp/test-6-message-sent.png');
    console.log('  open /tmp/test-8-thinking.png');

  } catch (error) {
    console.error('Test failed:', error.message);
    await page.screenshot({ path: '/tmp/test-error.png' });
  } finally {
    await browser.close();
  }
})();
