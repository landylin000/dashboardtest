/// <reference types="vite/client" />

declare module 'vue3-apexcharts' {
  import { DefineComponent } from 'vue';

  interface ApexChartsProps {
    type?: string;
    height?: string | number;
    width?: string | number;
    options?: object;
    series?: unknown[];
  }

  const VueApexCharts: DefineComponent<ApexChartsProps>;
  export default VueApexCharts;
}
