import { lessons, subjects } from '../src/content/catalog';
import { catalogSummary, validateCatalog } from '../src/content/validate';

const errors = validateCatalog(subjects, lessons);

if (errors.length > 0) {
  for (const error of errors) console.error(error);
  process.exitCode = 1;
} else {
  console.log(catalogSummary(subjects, lessons));
}
