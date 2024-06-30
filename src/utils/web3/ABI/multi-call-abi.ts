export const ABI_MULTI_CALL = [
  {
    inputs: [
      { internalType: 'address[]', name: 'targets', type: 'address[]' },
      { internalType: 'bytes[]', name: 'data', type: 'bytes[]' },
    ],
    name: 'multiCall',
    outputs: [{ internalType: 'bytes[]', name: '', type: 'bytes[]' }],
    stateMutability: 'view',
    type: 'function',
  },
] as any;
