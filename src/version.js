// Which version of the game this copy is. deploy/vps/activate.sh writes the commit it ships over this file, and the
// same into version.json beside the page, which an open page asks for to learn that a newer one is out
// (src/ui/update.js). Empty here: a local host neither looks for a new version nor shows one in Settings.
export const VERSION = '';
