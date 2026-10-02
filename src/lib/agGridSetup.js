// AG Grid (≈1 MB) and its CSS, loaded only when a desktop grid is shown —
// phones use the lightweight list views instead.
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

ModuleRegistry.registerModules([AllCommunityModule]);

export { AgGridReact } from 'ag-grid-react';
