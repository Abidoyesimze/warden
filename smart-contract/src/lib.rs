//! Warden treasury contract.
//!
//! Holds the business's USDC and is the only thing that can send it.
//! Full policy (caps, holds, approvals, events) lands in Phase 2.

use near_sdk::{env, near, AccountId, PanicOnDefault};

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Treasury {
    owner: AccountId,
    agent: AccountId,
}

#[near]
impl Treasury {
    #[init]
    pub fn new(owner: AccountId, agent: AccountId) -> Self {
        Self { owner, agent }
    }

    pub fn get_owner(&self) -> AccountId {
        self.owner.clone()
    }

    pub fn get_agent(&self) -> AccountId {
        self.agent.clone()
    }

    pub fn set_agent(&mut self, agent: AccountId) {
        assert_eq!(env::predecessor_account_id(), self.owner, "Only the owner");
        self.agent = agent;
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::test_utils::VMContextBuilder;
    use near_sdk::testing_env;

    fn acc(s: &str) -> AccountId {
        s.parse().unwrap()
    }

    #[test]
    fn init_sets_roles() {
        let c = Treasury::new(acc("owner.near"), acc("agent.near"));
        assert_eq!(c.get_owner(), acc("owner.near"));
        assert_eq!(c.get_agent(), acc("agent.near"));
    }

    #[test]
    #[should_panic(expected = "Only the owner")]
    fn agent_cannot_change_agent() {
        testing_env!(VMContextBuilder::new().predecessor_account_id(acc("agent.near")).build());
        let mut c = Treasury::new(acc("owner.near"), acc("agent.near"));
        c.set_agent(acc("evil.near"));
    }
}
