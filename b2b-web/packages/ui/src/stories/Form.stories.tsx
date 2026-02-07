import type { Meta, StoryObj } from "@storybook/react";
import {
  Form,
  FormField,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "../components/form";
import { Input } from "../components/input";
import { Button } from "../components/button";
import { Checkbox } from "../components/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/select";

const meta: Meta<typeof Form> = {
  title: "Components/Form",
  component: Form,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Form className="w-[400px]">
      <FormField name="username">
        <FormLabel>Username</FormLabel>
        <FormControl>
          <Input placeholder="Enter username" />
        </FormControl>
        <FormDescription>
          This is your public display name.
        </FormDescription>
      </FormField>
      <Button type="submit">Submit</Button>
    </Form>
  ),
};

export const WithError: Story = {
  render: () => (
    <Form className="w-[400px]">
      <FormField name="email" error="Please enter a valid email address">
        <FormLabel>Email</FormLabel>
        <FormControl>
          <Input placeholder="Enter email" type="email" />
        </FormControl>
        <FormMessage />
      </FormField>
      <Button type="submit">Submit</Button>
    </Form>
  ),
};

export const CompleteForm: Story = {
  render: () => (
    <Form className="w-[400px]">
      <FormField name="fullName">
        <FormLabel>Full Name</FormLabel>
        <FormControl>
          <Input placeholder="John Doe" />
        </FormControl>
      </FormField>

      <FormField name="email">
        <FormLabel>Email</FormLabel>
        <FormControl>
          <Input placeholder="john@example.com" type="email" />
        </FormControl>
      </FormField>

      <FormField name="role">
        <FormLabel>Role</FormLabel>
        <FormControl>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="guest">Guest</SelectItem>
            </SelectContent>
          </Select>
        </FormControl>
      </FormField>

      <FormField name="terms">
        <div className="flex items-center space-x-2">
          <FormControl>
            <Checkbox />
          </FormControl>
          <FormLabel>Accept terms and conditions</FormLabel>
        </div>
      </FormField>

      <Button type="submit">Create Account</Button>
    </Form>
  ),
};
