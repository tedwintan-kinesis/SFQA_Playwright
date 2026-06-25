<RULE[workspace]>
Always remind the user to reload or reinstall the extension if there are code changes related to the extension.
Whenever you modify files in the `public/chrome_extension/` directory, you MUST recreate the zip archive using: `Compress-Archive -Path "public\chrome_extension\*" -DestinationPath "public\chrome_extension.zip" -Force`
</RULE[workspace]>
