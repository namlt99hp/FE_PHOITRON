export interface FunctionMappingItem {
  id: string;
  functionCode: string;
  methodName: string;
  ten: string; // Vietnamese display name
  description: string;
  parameters: string[];
  returnType: string;
  dependsOn?: string[]; // functionCode dependencies
}

export const FUNCTION_MAPPING_LIST: FunctionMappingItem[] = [
  {
    id: 'gang_output',
    functionCode: 'GANG_OUTPUT',
    methodName: 'CalculateGangOutput',
    ten: 'Sản lượng Gang',
    description: 'Tính toán sản lượng Gang',
    parameters: ['context'],
    returnType: 'decimal'
  },
  {
    id: 'ore_consumption',
    functionCode: 'ORE_CONSUMPTION',
    methodName: 'CalculateOreConsumption',
    ten: 'Tiêu hao quặng',
    description: 'Tính toán tiêu hao quặng',
    parameters: ['context'],
    returnType: 'decimal',
    dependsOn: ['GANG_OUTPUT']
  },
  {
    id: 'coke_25_80',
    functionCode: 'COKE_25_80',
    methodName: 'CalculateCoke2580',
    ten: 'Than cốc 25-80mm',
    description: 'Tính than cốc cỡ 25-80mm',
    parameters: ['context'],
    returnType: 'decimal'
  },
  {
    id: 'coke_10_25',
    functionCode: 'COKE_10_25',
    methodName: 'CalculateCoke1025',
    ten: 'Than cốc 10-25mm',
    description: 'Tính than cốc cỡ 10-25mm',
    parameters: ['context'],
    returnType: 'decimal'
  },
  {
    id: 'pulverized_coal',
    functionCode: 'PULVERIZED_COAL',
    methodName: 'CalculatePulverizedCoal',
    ten: 'Than phun',
    description: 'Tính than phun',
    parameters: ['context'],
    returnType: 'decimal'
  },
  {
    id: 'total_fuel',
    functionCode: 'TOTAL_FUEL',
    methodName: 'CalculateTotalFuel',
    ten: 'Tổng nhiên liệu',
    description: 'Tính tổng nhiên liệu',
    parameters: ['context'],
    returnType: 'decimal',
    dependsOn: ['COKE_25_80','COKE_10_25','PULVERIZED_COAL']
  },
  {
    id: 'slag_output',
    functionCode: 'SLAG_OUTPUT',
    methodName: 'CalculateSlagOutput',
    ten: 'Sản lượng xỉ',
    description: 'Tính sản lượng xỉ',
    parameters: ['context'],
    returnType: 'decimal'
  },
  {
    id: 'r2_basicity',
    functionCode: 'R2_BASICITY',
    methodName: 'CalculateR2Basicity',
    ten: 'Độ kiềm R2',
    description: 'Tính độ kiềm R2',
    parameters: ['context'],
    returnType: 'decimal'
  },
  {
    id: 'ore_quality',
    functionCode: 'ORE_QUALITY',
    methodName: 'CalculateOreQuality',
    ten: 'Chất lượng quặng',
    description: 'Tính phẩm vị quặng vào lò',
    parameters: ['context'],
    returnType: 'decimal'
  },
  {
    id: 'k2o_na2o_from_qtk',
    functionCode: 'K2O_NA2O_FROM_QTK',
    methodName: 'CalculateK2ONa2OFromQtk',
    ten: 'K2O + Na2O từ quặng thiêu kết',
    description: 'Tính K2O + Na2O từ quặng thiêu kết',
    parameters: ['context'],
    returnType: 'decimal'
  },
  {
    id: 'k2o_na2o_from_qvv_qc',
    functionCode: 'K2O_NA2O_FROM_QVV_QC',
    methodName: 'CalculateK2ONa2OFromQvvQc',
    ten: 'K2O + Na2O từ QVV/QC',
    description: 'Tính K2O + Na2O từ quặng vê viên và QC',
    parameters: ['context'],
    returnType: 'decimal'
  },
  {
    id: 'k2o_na2o_from_coke',
    functionCode: 'K2O_NA2O_FROM_COKE',
    methodName: 'CalculateK2ONa2OFromCoke',
    ten: 'K2O + Na2O từ than cốc',
    description: 'Tính K2O + Na2O từ quặng Coke',
    parameters: ['context'],
    returnType: 'decimal'
  },
  {
    id: 'k2o_na2o_from_pulverized_coal',
    functionCode: 'K2O_NA2O_FROM_PULVERIZED_COAL',
    methodName: 'CalculateK2ONa2OFromPulverizedCoal',
    ten: 'K2O + Na2O từ than nghiền',
    description: 'Tính K2O + Na2O từ than phun',
    parameters: ['context'],
    returnType: 'decimal'
  },
  {
    id: 'total_klk_into_bf',
    functionCode: 'TOTAL_KLK_INTO_BF',
    methodName: 'CalculateTotalKlkIntoBF',
    ten: 'Tổng KLK vào lò cao',
    description: 'Tính tổng KLK vào lò cao',
    parameters: ['context'],
    returnType: 'decimal',
    dependsOn: ['K2O_NA2O_FROM_QTK','K2O_NA2O_FROM_QVV_QC','K2O_NA2O_FROM_COKE','K2O_NA2O_FROM_PULVERIZED_COAL']
  },
  {
    id: 'total_zn_into_bf',
    functionCode: 'TOTAL_ZN_INTO_BF',
    methodName: 'CalculateTotalZnIntoBF',
    ten: 'Tổng Zn vào lò cao',
    description: 'Tính tổng Zn vào lò cao',
    parameters: ['context'],
    returnType: 'decimal'
  },
  {
    id: 'slag_melting_temp',
    functionCode: 'SLAG_MELTING_TEMP',
    methodName: 'CalculateSlagMeltingTemp',
    ten: 'Nhiệt độ nóng chảy xỉ',
    description: 'Tính nhiệt độ nóng chảy xỉ',
    parameters: ['context'],
    returnType: 'decimal'
  }
];
