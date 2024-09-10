import { DynamoDB } from 'aws-sdk';
import { Todo } from '../types/todo';

export class TodoTable {
  private docClient: DynamoDB.DocumentClient;
  private tableName: string = 'Todos';

  constructor(config?: DynamoDB.ClientConfiguration) {
    this.docClient = new DynamoDB.DocumentClient(config);
  }

  async getAllTodos(): Promise<Todo[]> {
    const result = await this.docClient.scan({ TableName: this.tableName }).promise();
    return result.Items as Todo[];
  }

  async getTodoById(id: string): Promise<Todo | null> {
    const result = await this.docClient.get({
      TableName: this.tableName,
      Key: { id },
    }).promise();
    return result.Item as Todo | null;
  }

  async createTodo(todo: Omit<Todo, 'id'>): Promise<Todo> {
    const newTodo: Todo = { id: Date.now().toString(), ...todo };
    await this.docClient.put({
      TableName: this.tableName,
      Item: newTodo,
    }).promise();
    return newTodo;
  }

  async updateTodo(id: string, todo: Partial<Todo>): Promise<Todo | null> {
    const updateExpression = 'set ' + Object.keys(todo).map(key => `#${key} = :${key}`).join(', ');
    const expressionAttributeNames = Object.keys(todo).reduce((acc, key) => ({ ...acc, [`#${key}`]: key }), {});
    const expressionAttributeValues = Object.entries(todo).reduce((acc, [key, value]) => ({ ...acc, [`:${key}`]: value }), {});

    const result = await this.docClient.update({
      TableName: this.tableName,
      Key: { id },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    }).promise();

    return result.Attributes as Todo | null;
  }

  async deleteTodo(id: string): Promise<void> {
    await this.docClient.delete({
      TableName: this.tableName,
      Key: { id },
    }).promise();
  }
}