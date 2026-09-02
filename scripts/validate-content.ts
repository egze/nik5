import { lessons, subjects } from '../src/content/catalog';
import { validateCatalog } from '../src/content/validate';

const errors = validateCatalog(subjects, lessons);

if (errors.length > 0) {
  for (const error of errors) console.error(error);
  process.exitCode = 1;
} else {
  console.log('Inhalte geprüft: 1 Fach, 1 Lektion, 38 Einträge.');
}
