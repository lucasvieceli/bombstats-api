import { DataSource, DataSourceOptions } from 'typeorm';
import datasource from './config';

export default new DataSource(datasource as DataSourceOptions);
