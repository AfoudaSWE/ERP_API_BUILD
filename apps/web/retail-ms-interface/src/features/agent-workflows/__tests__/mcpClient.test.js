import { afterEach, describe, expect, it, vi } from 'vitest';
import { discoverMcpServer, validateMcpEndpoint } from '../domain/mcpClient';

afterEach(() => vi.unstubAllGlobals());

describe('MCP Streamable HTTP discovery', () => {
  it('initializes the server and discovers tools', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        jsonrpc: '2.0', id: 1, result: {
          protocolVersion: '2025-06-18',
          capabilities: { tools: {} },
          serverInfo: { name: 'Test MCP', version: '1.0.0' },
        },
      }), { status: 200, headers: { 'Content-Type': 'application/json', 'Mcp-Session-Id': 'session-1' } }))
      .mockResolvedValueOnce(new Response(null, { status: 202 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        jsonrpc: '2.0', id: 2, result: { tools: [{ name: 'echo', description: 'Echo text', inputSchema: { type: 'object' } }] },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await discoverMcpServer('http://127.0.0.1:7331/mcp');

    expect(result.serverInfo.name).toBe('Test MCP');
    expect(result.tools).toHaveLength(1);
    expect(result.tools[0].name).toBe('echo');
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[2][1].headers['Mcp-Session-Id']).toBe('session-1');
  });

  it('rejects unsupported transports and malformed tool results', async () => {
    expect(() => validateMcpEndpoint('stdio://example')).toThrow('Only Streamable HTTP');
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: { serverInfo: { name: 'Broken' } } }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(null, { status: 202 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ jsonrpc: '2.0', id: 2, result: {} }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(discoverMcpServer('https://example.com/mcp')).rejects.toThrow('valid tools list');
  });
});
