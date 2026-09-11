import commerce from '../assets/d365-commerce.svg';
import finance from '../assets/d365-finance.svg';
import projectOperations from '../assets/d365-project-operations.svg';
import supplyChain from '../assets/d365-supply-chain.svg';

/**
 * The four Finance & Operations applications the tool covers, as one mark.
 * Kept as four files: the official icons share gradient ids and would overwrite
 * each other if they were inlined in a single document.
 */
const APPS = [
  { src: finance, name: 'Dynamics 365 Finance' },
  { src: supplyChain, name: 'Dynamics 365 Supply Chain Management' },
  { src: commerce, name: 'Dynamics 365 Commerce' },
  { src: projectOperations, name: 'Dynamics 365 Project Operations' },
];

export function BrandMark() {
  return (
    <span className="brand-mark">
      {APPS.map((app) => (
        <img key={app.name} src={app.src} alt="" title={app.name} width={20} height={20} />
      ))}
    </span>
  );
}
