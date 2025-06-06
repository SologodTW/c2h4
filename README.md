# Shopify Starter Template

> An example of a shopify project.

## 📃 Set Up

Clone this repository from your GitHub or Click [Use this template](https://github.com/View-Source-Dev/starter-shopify/generate).

## 🛠️ Development

1. [Install Shopify CLI](https://shopify.dev/docs/api/shopify-cli)
2. Install, minify and upload essential assets from [starter-library](https://github.com/View-Source-Dev/starter-library/tree/v2/_installs)
3. Create your own development branch:
   ```shell
   git checkout -b dev-[YOUR-NAME]
   ```
4. Connect to the store if you haven't already:
   ```shell
   shopify theme dev --store {store_name}
   ```
5. Start a local dev environment:
   ```shell
   shopify theme dev --theme-editor-sync
   ```
   - [Shopify CLI Theme commands](https://shopify.dev/docs/themes/tools/cli/commands#dev)
   - This command will do 3 things:
     1. Generate a local url:  http://127.0.0.1:9292
     2. Link to a customizer/theme editor for content editing: https://store-domain.myshopify.com/admin/themes/{local_theme_id}/editor
     3. Preview link to share: https://store-domain.myshopify.com.myshopify.com/?preview_theme_id={local_theme_id}
   - ⚠️ If you're seeing themes other than your local theme, append `?preview_theme_id={local_theme_id}` to http://127.0.0.1:9292
6. Push your changes to the remote dev theme on Shopify store:
   1. `git checkout dev`
   2. Retrieve latest updates: `git pull origin dev`
   3. `git checkout dev-[YOUR-NAME]`
   4. `git rebase dev`
   5. Resolve any conflicts, and continue the rebase with: `git rebase --continue`
   6. `git checkout dev`
   7. `git merge dev-[YOUR-NAME]`
   8. `git push origin dev`

## 🐞 Known issues

### Shopify CLI keeps refreshing with `--theme-editor-sync` flag

If you find your local server gets stuck in an infinite get/update loop with the commend `shopify theme dev --theme-editor-sync`:

```shell
  • 11:53:19 Synced » get config/settings_schema.json
  • 11:53:20 Synced » update config/settings_schema.json
	...
  • 11:53:26 Synced » get other_json_files.json
  • 11:53:27 Synced » update other_json_files.json
	...
```

1. If the issue happens with `config/settings_schema.json`, append a trailing commas to the last item of the array
   - If the comma is removed by formatter, open Visual Studio Code command palette by Command/Ctrl + Shift + P
   - Search for "File: Save without Formatting" and run the commend to save the file without formatting
2. If the issue happens with other JSON files, check the file and remove any Unicode `U+2028` or `\u2028`
   - This usually happens by copy/paste text into a single-line text box in the theme editor from Figma

See full discussion on https://github.com/Shopify/cli/issues/3222

## 💡 Extras/Tips

### VS Code plugin settings

- Live Sass Compiler - help you to compile/transpile your SASS/SCSS files to CSS files at realtime with live browser reload.
  All settings are listed in [Settings Docs](https://github.com/ritwickdey/vscode-live-sass-compiler/blob/master/docs/settings.md). This extension has dependency on [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension for live browser reload.
- Prettier - Code formatter.
  config in `.prettierrc`
