[[Release Notes (CharacterManaJ - Version 1.0.0.2 - Java17 Runtime Bundled)]]
February 22, 2024

Homepage
https://sourceforge.net/projects/charactermanaj/

== Changes from Ver0.10 ==

- The Java bundled version has been changed to use jlink from OpenJDK Eclipse Temurin-17.0.10+7
   https://adoptium.net/temurin/

- Added a color pattern registration feature
   In the color settings dialog, you can now name your settings. These settings are saved in the same location as the character data directory as color-patterns.xml.

- The appConfig configuration file is now changed to save only the differences
   Previously, changing a setting would save all settings items as an XML file, but starting from this version, only items that differ from the default values are saved.

- Organized the location of configuration files
 - For Linux, it now follows the standard XDG

- Made minor adjustments to the layout

- Updated the launcher's native code
 - Supported customization of the Java launch parameter file
   You can describe JAVA launch parameters in a text file named:
   C:\Users\USERNAME\AppData\Local\CharacterManaJ\jvm_options
   The charactermanaj.ini file under the exe is also valid as before.

   For example, to specify the amount of memory JAVA uses, write:
     -Xmx512m
   to use 512MBytes of memory as heap memory. If nothing is specified, the JAVA runtime will allocate automatically. The amount of memory allocated can be checked in the System tab of the Help's About menu.
   (In versions 0.98 and 0.99, the ini file had a smaller default value specified, but in 1.0, no memory is specified.)

- Adjusted the log output format
- Changed to keep the download file when a download URL is specified during import
- Changed to display a confirmation dialog before accessing if the download URL is unknown

End
