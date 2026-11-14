/** Plain-language Spanish descriptions; original LAPD codes remain in the source. */
const LABELS: Record<string, string> = {
  'ASSAULT WITH DEADLY WEAPON, AGGRAVATED ASSAULT': 'Agresión con arma o agravada',
  'BATTERY - SIMPLE ASSAULT': 'Agresión física simple',
  'BURGLARY': 'Ingreso ilícito a un inmueble para delinquir',
  'BURGLARY FROM VEHICLE': 'Sustracción de objetos del vehículo',
  'INTIMATE PARTNER - SIMPLE ASSAULT': 'Agresión física de pareja',
  'ROBBERY': 'Robo con violencia o intimidación',
  'SHOPLIFTING - PETTY THEFT ($950 & UNDER)': 'Hurto en comercios (hasta US$950)',
  'THEFT FROM MOTOR VEHICLE - GRAND ($950.01 AND OVER)': 'Hurto de objetos del vehículo (más de US$950)',
  'THEFT FROM MOTOR VEHICLE - PETTY ($950 & UNDER)': 'Hurto de objetos del vehículo (hasta US$950)',
  'THEFT OF IDENTITY': 'Suplantación de identidad',
  'THEFT PLAIN - PETTY ($950 & UNDER)': 'Hurto de bienes (hasta US$950)',
  'THEFT-GRAND ($950.01 & OVER)EXCPT,GUNS,FOWL,LIVESTK,PROD': 'Hurto de bienes de mayor valor (más de US$950)',
  'VANDALISM - FELONY ($400 & OVER, ALL CHURCH VANDALISMS)': 'Vandalismo grave (US$400 o más, o en iglesias)',
  'VANDALISM - MISDEAMEANOR ($399 OR UNDER)': 'Vandalismo de menor cuantía (hasta US$399)',
  'VEHICLE - STOLEN': 'Sustracción de vehículos',
};
export function crimeLabel(original: string): string { return LABELS[original] || original; }
