import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthFailure } from "@/store/auth";
import * as auth from "@/store/auth";
import { AuthButton } from "../shell/AuthButton";
import { AuthDialog } from "./AuthDialog";
import { authErrorKey } from "./errors";

vi.mock("@/store/firebase", () => ({ firebaseEnabled: true, getFirebase: vi.fn() }));

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("authErrorKey", () => {
  it("explains each failure in plain words", () => {
    expect(authErrorKey("auth/invalid-credential")).toBe("auth.err.invalid");
    expect(authErrorKey("auth/wrong-password")).toBe("auth.err.invalid");
    expect(authErrorKey("auth/user-not-found")).toBe("auth.err.invalid");
    expect(authErrorKey("auth/email-already-in-use")).toBe("auth.err.exists");
    expect(authErrorKey("auth/weak-password")).toBe("auth.err.weak");
    expect(authErrorKey("auth/invalid-email")).toBe("auth.err.email");
    expect(authErrorKey("auth/popup-blocked")).toBe("auth.err.popup");
    expect(authErrorKey("auth/unauthorized-domain")).toBe("auth.err.domain");
    expect(authErrorKey("auth/network-request-failed")).toBe("auth.err.network");
    expect(authErrorKey("auth/too-many-requests")).toBe("auth.err.many");
    expect(authErrorKey("auth/operation-not-allowed")).toBe("auth.err.disabled");
  });

  it("stays quiet when the person simply closes the window, and has a fallback for the unknown", () => {
    expect(authErrorKey("auth/popup-closed-by-user")).toBeNull();
    expect(authErrorKey("auth/cancelled-popup-request")).toBeNull();
    expect(authErrorKey("auth/something-new")).toBe("auth.error");
  });
});

describe("AuthDialog", () => {
  const open = () => render(<AuthDialog onClose={vi.fn()} />);

  it("offers Google first, then email and password", () => {
    open();
    expect(
      screen.getByRole("dialog", { name: "Sign in to keep your household" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("signs in with Google and closes", async () => {
    const google = vi.spyOn(auth, "signInWithGoogle").mockResolvedValue();
    const onClose = vi.fn();
    render(<AuthDialog onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: "Continue with Google" }));
    expect(google).toHaveBeenCalledOnce();
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("shows a visible, plain message when Google sign-in fails, and keeps the dialog open", async () => {
    vi.spyOn(auth, "signInWithGoogle").mockRejectedValue(
      new AuthFailure("auth/unauthorized-domain"),
    );
    const onClose = vi.fn();
    render(<AuthDialog onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: "Continue with Google" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Sign-in isn't set up for localhost yet.",
    );
    expect(onClose).not.toHaveBeenCalled();
  });

  it("says nothing when the person just closes the Google window", async () => {
    vi.spyOn(auth, "signInWithGoogle").mockRejectedValue(
      new AuthFailure("auth/popup-closed-by-user"),
    );
    open();
    await userEvent.click(screen.getByRole("button", { name: "Continue with Google" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Continue with Google" })).toBeEnabled(),
    );
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("signs in with email and password", async () => {
    const signIn = vi.spyOn(auth, "signInWithEmail").mockResolvedValue();
    open();
    await userEvent.type(screen.getByLabelText("Email"), "  asha@example.com ");
    await userEvent.type(screen.getByLabelText("Password"), "secret-pass");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(signIn).toHaveBeenCalledWith("asha@example.com", "secret-pass");
  });

  it("creates an account, enforcing the password length first", async () => {
    const signUp = vi.spyOn(auth, "signUpWithEmail").mockResolvedValue();
    open();
    await userEvent.click(screen.getByRole("button", { name: "New here? Create an account" }));
    expect(screen.getByText("At least 8 characters")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Email"), "asha@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "short");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("at least 8 characters");
    expect(screen.getByLabelText("Password")).toHaveAttribute("aria-invalid", "true");
    expect(signUp).not.toHaveBeenCalled();
    await userEvent.type(screen.getByLabelText("Password"), "-and-longer");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(signUp).toHaveBeenCalledWith("asha@example.com", "short-and-longer");
  });

  it("validates the email and the empty password before calling Firebase", async () => {
    const signIn = vi.spyOn(auth, "signInWithEmail").mockResolvedValue();
    open();
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Enter a valid email address.");
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
    await userEvent.type(screen.getByLabelText("Email"), "asha@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Enter your email and password.");
    expect(signIn).not.toHaveBeenCalled();
  });

  it("explains a wrong password and an existing account", async () => {
    vi.spyOn(auth, "signInWithEmail").mockRejectedValue(new AuthFailure("auth/invalid-credential"));
    open();
    await userEvent.type(screen.getByLabelText("Email"), "asha@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "nope-nope");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "That email or password isn't right.",
    );
  });

  it("sends a password reset without revealing whether the account exists", async () => {
    const reset = vi.spyOn(auth, "sendReset").mockResolvedValue();
    open();
    await userEvent.click(screen.getByRole("button", { name: "Forgot password?" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Enter a valid email address.");
    await userEvent.type(screen.getByLabelText("Email"), "asha@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Forgot password?" }));
    expect(reset).toHaveBeenCalledWith("asha@example.com");
    expect(await screen.findByRole("status")).toHaveTextContent(
      "If an account exists for asha@example.com",
    );
  });

  it("reports a failed reset and can switch back to signing in", async () => {
    vi.spyOn(auth, "sendReset").mockRejectedValue(new AuthFailure("auth/network-request-failed"));
    open();
    await userEvent.type(screen.getByLabelText("Email"), "asha@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Forgot password?" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "couldn't reach the sign-in service",
    );
    await userEvent.click(screen.getByRole("button", { name: "New here? Create an account" }));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByRole("button", { name: "Forgot password?" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Already have an account? Sign in" }));
    expect(screen.getByRole("button", { name: "Forgot password?" })).toBeInTheDocument();
  });

  it("closes from the close button and on a backdrop click", async () => {
    const onClose = vi.fn();
    const { unmount } = render(<AuthDialog onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    unmount();
    const again = vi.fn();
    render(<AuthDialog onClose={again} />);
    await userEvent.click(screen.getByRole("dialog"));
    expect(again).toHaveBeenCalledTimes(1);
  });
});

describe("AuthButton", () => {
  it("opens the dialog and starts following sign-in only when clicked", async () => {
    const watch = vi.spyOn(auth, "watchAuth").mockResolvedValue(() => {});
    render(<AuthButton />);
    expect(watch).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(watch).toHaveBeenCalledOnce();
  });

  it("shows who is signed in and signs out", async () => {
    const signOut = vi.spyOn(auth, "signOutUser").mockResolvedValue();
    vi.spyOn(auth, "watchAuth").mockImplementation(async (onUser) => {
      onUser({ email: "asha@example.com", displayName: null } as never);
      return () => {};
    });
    render(<AuthButton />);
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Signed in as asha@example.com")).toBeInTheDocument();
    expect(localStorage.getItem("saans.signedIn")).toBe("1");
    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(signOut).toHaveBeenCalledOnce();
  });

  it("restores a returning person's session without a click", async () => {
    localStorage.setItem("saans.signedIn", "1");
    const watch = vi.spyOn(auth, "watchAuth").mockImplementation(async (onUser) => {
      onUser({ email: "back@example.com", displayName: null } as never);
      return () => {};
    });
    render(<AuthButton />);
    expect(await screen.findByText("Signed in as back@example.com")).toBeInTheDocument();
    expect(watch).toHaveBeenCalledOnce();
  });

  it("forgets the session hint once Firebase says nobody is signed in", async () => {
    localStorage.setItem("saans.signedIn", "1");
    vi.spyOn(auth, "watchAuth").mockImplementation(async (onUser) => {
      onUser(null);
      return () => {};
    });
    render(<AuthButton />);
    await waitFor(() => expect(localStorage.getItem("saans.signedIn")).toBeNull());
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });

  it("keeps working if Firebase can't be reached", async () => {
    vi.spyOn(auth, "watchAuth").mockRejectedValue(new AuthFailure("auth/network-request-failed"));
    render(<AuthButton />);
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
