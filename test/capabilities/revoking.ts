import { Client, Provider, ProviderRegistry } from "@blockstack/clarity"
import { assert } from "chai"
import Accounts from '../accounts'
import TokenHelper from '../../src/TokenHelper'
import { createCheckAndDeploy } from "../setup"

describe("Tokensoft Token revoking capability", () => {
  let provider: Provider
  let tokensoftTokenClient: Client

  before(async () => {
    provider = await ProviderRegistry.createProvider()
    await createCheckAndDeploy(`${Accounts.alice}.ft-trait`, 'ft-trait', provider)
    await createCheckAndDeploy(`${Accounts.alice}.restricted-token-trait`, 'restricted-token-trait', provider)
    tokensoftTokenClient = await createCheckAndDeploy(`${Accounts.alice}.tokensoft-token`, "tokensoft-token", provider)
    await TokenHelper.Meta.initialize(
      tokensoftTokenClient,
      "Tokensoft Token",
      "TSFT",
      8,
      Accounts.alice,
      Accounts.alice
    )
  })

  it("should not be able to revoke tokens without role or no tokens to burn", async () => {

    // Allow Alice to mint
    await TokenHelper.Roles.addToRole(
      tokensoftTokenClient,
      TokenHelper.Roles.ROLE_TYPES.MINTER,
      Accounts.alice,
      Accounts.alice
    )

    // Mint some tokens
    await TokenHelper.Capabilities.mintTokens(
      tokensoftTokenClient,
      100,
      Accounts.alice,
      Accounts.alice
    )

    // Tokens were minted
    assert.equal(await TokenHelper.Meta.supply(tokensoftTokenClient), 100)
    assert.equal(await TokenHelper.Meta.balanceOf(tokensoftTokenClient, Accounts.alice), 100)      

    try {
      await TokenHelper.Capabilities.revokeTokens(
        tokensoftTokenClient,
        100,
        Accounts.alice,
        Accounts.bob,
        Accounts.alice
      )
      assert.fail('should not allow revoking without role')
    }catch{}
    
    // Give alice the capability to burn
    await TokenHelper.Roles.addToRole(
      tokensoftTokenClient,
      TokenHelper.Roles.ROLE_TYPES.REVOKER,
      Accounts.alice,
      Accounts.alice
    )

    // Burn em
    await TokenHelper.Capabilities.revokeTokens(
      tokensoftTokenClient,
      100,
      Accounts.alice,
      Accounts.bob,
      Accounts.alice
    )

    // Verify revoke
    assert.equal(await TokenHelper.Meta.supply(tokensoftTokenClient), 100)
    assert.equal(await TokenHelper.Meta.balanceOf(tokensoftTokenClient, Accounts.alice), 0)     
    assert.equal(await TokenHelper.Meta.balanceOf(tokensoftTokenClient, Accounts.bob), 100)     

    // Should fail since the acct doesn't have any tokens
    try {
      await TokenHelper.Capabilities.revokeTokens(
        tokensoftTokenClient,
        100,
        Accounts.alice,
        Accounts.bob,
        Accounts.alice
      )
      assert.fail('should not allow burning when no balance')
    }catch{}

  })

  it("revoke scenarios", async () => {

    await TokenHelper.Capabilities.mintTokens(
      tokensoftTokenClient,
      100,
      Accounts.alice,
      Accounts.alice
    )
    await TokenHelper.Capabilities.mintTokens(
      tokensoftTokenClient,
      100,
      Accounts.carol,
      Accounts.alice
    )

    // All accounts should have 100
    assert.equal(await TokenHelper.Meta.supply(tokensoftTokenClient), 300)
    assert.equal(await TokenHelper.Meta.balanceOf(tokensoftTokenClient, Accounts.alice), 100)
    assert.equal(await TokenHelper.Meta.balanceOf(tokensoftTokenClient, Accounts.bob), 100)
    assert.equal(await TokenHelper.Meta.balanceOf(tokensoftTokenClient, Accounts.carol), 100)

    // Do a loop and end up back where we started
    await TokenHelper.Capabilities.revokeTokens(
      tokensoftTokenClient,
      20,
      Accounts.alice,
      Accounts.bob,
      Accounts.alice
    )

    await TokenHelper.Capabilities.revokeTokens(
      tokensoftTokenClient,
      20,
      Accounts.bob,
      Accounts.carol,
      Accounts.alice
    )

    await TokenHelper.Capabilities.revokeTokens(
      tokensoftTokenClient,
      20,
      Accounts.carol,
      Accounts.alice,
      Accounts.alice
    )

    assert.equal(await TokenHelper.Meta.supply(tokensoftTokenClient), 300)
    assert.equal(await TokenHelper.Meta.balanceOf(tokensoftTokenClient, Accounts.alice), 100)
    assert.equal(await TokenHelper.Meta.balanceOf(tokensoftTokenClient, Accounts.bob), 100)
    assert.equal(await TokenHelper.Meta.balanceOf(tokensoftTokenClient, Accounts.carol), 100)

    // Do multiple revokes against the same acct
    await TokenHelper.Capabilities.revokeTokens(
      tokensoftTokenClient,
      20,
      Accounts.bob,
      Accounts.carol,
      Accounts.alice
    )

    await TokenHelper.Capabilities.revokeTokens(
      tokensoftTokenClient,
      20,
      Accounts.bob,
      Accounts.carol,
      Accounts.alice
    )

    await TokenHelper.Capabilities.revokeTokens(
      tokensoftTokenClient,
      20,
      Accounts.bob,
      Accounts.carol,
      Accounts.alice
    )

    assert.equal(await TokenHelper.Meta.supply(tokensoftTokenClient), 300)
    assert.equal(await TokenHelper.Meta.balanceOf(tokensoftTokenClient, Accounts.alice), 100)
    assert.equal(await TokenHelper.Meta.balanceOf(tokensoftTokenClient, Accounts.bob), 40)
    assert.equal(await TokenHelper.Meta.balanceOf(tokensoftTokenClient, Accounts.carol), 160)
  })


  after(async () => {
    await provider.close()
  })
})
